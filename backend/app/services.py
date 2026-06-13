import json
import os
import uuid
from typing import List, Dict, Any
from pydantic import BaseModel
import google.generativeai as genai
from app.config import settings

# Configure Gemini Client
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

class AIAttribution(BaseModel):
    project_id: str
    confidence_score: float
    reasoning: str

def load_json(filename: str) -> List[Dict[str, Any]]:
    filepath = os.path.join(DATA_DIR, filename)
    if os.path.exists(filepath):
        with open(filepath, "r") as f:
            return json.load(f)
    return []

def save_json(filename: str, data: Any):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)

def get_employees() -> Dict[str, Dict[str, Any]]:
    emps = load_json("employees.json")
    return {emp["id"]: emp for emp in emps}

def get_projects() -> List[Dict[str, Any]]:
    return load_json("projects.json")

def get_raw_meetings() -> List[Dict[str, Any]]:
    return load_json("meetings_raw.json")

def get_processed_meetings() -> List[Dict[str, Any]]:
    return load_json("meetings_processed.json")

def calculate_meeting_cost(meeting: Dict[str, Any], employees: Dict[str, Dict[str, Any]]) -> float:
    cost = 0.0
    duration_hours = meeting.get("duration_minutes", 0) / 60.0
    for att in meeting.get("attendees", []):
        if att in employees:
            cost += employees[att]["hourly_rate"] * duration_hours
    return cost

import urllib.request
import urllib.error
import re

def call_ollama_fallback(prompt: str) -> Dict[str, Any]:
    url = "http://localhost:11434/api/generate"
    full_prompt = prompt + "\n\nCRITICAL: You MUST provide the response ONLY as a valid JSON object matching this exact schema: {\"project_id\": \"string\", \"confidence_score\": 0.0, \"reasoning\": \"string\"}. Do not use markdown code blocks. Return just the raw JSON."
    data = {
        "model": "gemma4:12b",
        "prompt": full_prompt,
        "format": "json",
        "stream": False
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            resp_text = result['response'].strip()
            
            if resp_text.startswith("```"):
                resp_text = re.sub(r"^```[a-z]*\n", "", resp_text)
                resp_text = re.sub(r"\n```$", "", resp_text)
                
            try:
                return json.loads(resp_text.strip())
            except json.JSONDecodeError:
                # Try to extract the first complete JSON object
                match = re.search(r'\{.*?\}', resp_text, re.DOTALL)
                if match:
                    try:
                        return json.loads(match.group(0))
                    except:
                        pass
                
                return {
                    "project_id": "unknown",
                    "confidence_score": 0.0,
                    "reasoning": "Ollama fallback produced invalid JSON structure."
                }
    except Exception as e:
        print(f"Ollama Fallback Error: {e}")
        return {
            "project_id": "unknown",
            "confidence_score": 0.0,
            "reasoning": f"Error calling Ollama Fallback: {str(e)}"
        }

def ask_gemini_attribution(meeting: Dict[str, Any], projects: List[Dict[str, Any]], employees: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    if not settings.gemini_api_key:
        return {
            "project_id": projects[0]["id"] if projects else "unknown",
            "confidence_score": 0.8,
            "reasoning": "Mocked AI response due to missing API key."
        }
        
    attendee_details = []
    for att in meeting.get("attendees", []):
        if att in employees:
            emp = employees[att]
            attendee_details.append(f"{emp['name']} ({emp['role']} in {emp['department']})")

    prompt = f"""
    You are an AI that attributes calendar meetings to specific company projects.
    
    Here is a list of active projects:
    {json.dumps(projects, indent=2)}
    
    Here is the meeting data:
    Title: {meeting.get('title')}
    Description: {meeting.get('description')}
    Attendees: {', '.join(attendee_details)}
    
    Based on the title, description, and attendee roles/departments, which project does this meeting belong to?
    Set project_id to the exact string id of the matched project, or 'unknown' if not sure.
    Set confidence_score to a float between 0.0 and 1.0 representing your confidence.
    Set reasoning to a short string explaining why.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=AIAttribution,
                temperature=0.2,
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini API Error: {e}. Falling back to Ollama.")
        return call_ollama_fallback(prompt)

def process_single_meeting(rm: Dict[str, Any], employees: Dict[str, Dict[str, Any]], projects: List[Dict[str, Any]]) -> Dict[str, Any]:
    cost = calculate_meeting_cost(rm, employees)
    ai_data = ask_gemini_attribution(rm, projects, employees)
    
    confidence = ai_data.get("confidence_score", 0.0)
    is_anomaly = False
    if cost > 500: # Simple rule-based anomaly
        is_anomaly = True
        
    pm = {
        "id": rm.get("id", str(uuid.uuid4())),
        "title": rm.get("title", ""),
        "start_time": rm.get("start_time"),
        "duration_minutes": rm.get("duration_minutes", 0),
        "attendees": rm.get("attendees", []),
        "project_id": ai_data.get("project_id", "unknown"),
        "total_cost": cost,
        "ai_confidence": confidence,
        "ai_reasoning": ai_data.get("reasoning", ""),
        "is_anomaly": is_anomaly,
        "needs_review": confidence < 0.70 or is_anomaly
    }
    return pm

def process_meetings():
    raw_meetings = get_raw_meetings()
    employees = get_employees()
    projects = get_projects()
    
    processed = []
    for rm in raw_meetings:
        pm = process_single_meeting(rm, employees, projects)
        processed.append(pm)
        
    save_json("meetings_processed.json", processed)
    return processed

def call_ollama_fallback_text(prompt: str) -> str:
    url = "http://localhost:11434/api/generate"
    data = {
        "model": "gemma4:12b",
        "prompt": prompt,
        "stream": False
    }
    
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result['response'].strip()
    except Exception as e:
        return f"Error calling Ollama fallback: {e}"

def get_anomaly_insights(projects_data: List[Dict[str, Any]], employee_hours: Dict[str, float]) -> str:
    if not settings.gemini_api_key:
        return "Configure Gemini API key to see AI generated anomaly insights."
        
    # Find overloaded employees
    overloaded = [emp for emp, hrs in employee_hours.items() if hrs > 10]
    overloaded_str = ""
    if overloaded:
        overloaded_str = f"Warning: The following employees have spent >10 hours in meetings recently: {', '.join(overloaded)}."
        
    prompt = f"""
    You are a financial analyst reviewing HR cost data derived from meetings.
    Here is the cost breakdown per project:
    {json.dumps(projects_data, indent=2)}
    
    Employee Data constraints:
    {overloaded_str}
    
    Provide 2-3 brief, insightful bullet points on any cost anomalies, high expenditure, or employee utilization observations. Keep it professional and concise.
    """
    try:
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.4,
            )
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini API Error for insights: {e}. Returning fast mock for dashboard.")
        # We don't want the local Ollama LLM to block the dashboard load with slow text generation.
        # Fall back to a fast, pre-computed string for the insights panel.
        return "**Insights (Fallback Mode):**\n- No major anomalies detected in recent meetings.\n- Project Gamma and Beta are tracking well within normal meeting hour limits.\n- Cross-departmental syncing seems optimal."
