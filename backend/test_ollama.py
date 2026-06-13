from app.services import ask_gemini_attribution, get_projects, get_employees
import google.generativeai as genai
from app.config import settings

# Force an invalid API key to trigger an exception and test the Ollama fallback
settings.gemini_api_key = "invalid_key_to_force_failure"
genai.configure(api_key="invalid_key_to_force_failure")

meeting = {
    "title": "Hackathon Brainstorming",
    "description": "Discussing AI architecture",
    "attendees": ["emp_1", "emp_2"]
}
projects = get_projects()
employees = get_employees()

print("Calling ask_gemini_attribution (Expect Gemini to fail and fallback to Ollama)...")
result = ask_gemini_attribution(meeting, projects, employees)
print("Result:")
print(result)
