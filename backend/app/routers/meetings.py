from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import datetime
import uuid
from pydantic import BaseModel
from app.services import get_processed_meetings, process_meetings, save_json, process_single_meeting, get_employees, get_projects, get_raw_meetings

router = APIRouter()

class CorrectionRequest(BaseModel):
    project_id: str

class NewMeetingRequest(BaseModel):
    title: str
    description: str
    duration_minutes: int
    attendees: List[str]

@router.get("/review")
def get_meetings_for_review():
    processed = get_processed_meetings()
    review_queue = [m for m in processed if m.get("needs_review", False)]
    return review_queue

import os
import random
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "token.json")

@router.post("/ingest")
def trigger_ingestion():
    from app.services import sync_token_from_cloud
    sync_token_from_cloud(TOKEN_FILE)
    
    if not os.path.exists(TOKEN_FILE):
        raise HTTPException(status_code=401, detail="Google Calendar not connected. Please connect first.")
        
    creds = Credentials.from_authorized_user_file(TOKEN_FILE, ['https://www.googleapis.com/auth/calendar.readonly'])
    service = build('calendar', 'v3', credentials=creds)
    
    now = datetime.datetime.utcnow().isoformat() + 'Z'
    one_month_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).isoformat() + 'Z'
    
    events_result = service.events().list(
        calendarId='primary', timeMin=one_month_ago, timeMax=now,
        maxResults=20, singleEvents=True, orderBy='startTime'
    ).execute()
    events = events_result.get('items', [])
    
    employees = get_employees()
    projects = get_projects()
    emp_ids = list(employees.keys())
    
    processed = []
    raw_meetings = []
    
    for event in events:
        start_str = event['start'].get('dateTime', event['start'].get('date'))
        end_str = event['end'].get('dateTime', event['end'].get('date'))
        
        duration = 30
        try:
            start_dt = datetime.datetime.fromisoformat(start_str.replace('Z', '+00:00'))
            end_dt = datetime.datetime.fromisoformat(end_str.replace('Z', '+00:00'))
            duration = int((end_dt - start_dt).total_seconds() / 60)
        except:
            pass
            
        new_raw = {
            "id": event.get('id', str(uuid.uuid4())),
            "title": event.get('summary', 'Untitled Meeting'),
            "description": event.get('description', ''),
            "start_time": start_str,
            "duration_minutes": duration,
            "attendees": random.sample(emp_ids, min(len(emp_ids), random.randint(2, 5)))
        }
        raw_meetings.append(new_raw)
        
        pm = process_single_meeting(new_raw, employees, projects)
        processed.append(pm)
        
    save_json("meetings_raw.json", raw_meetings)
    save_json("meetings_processed.json", processed)
    
    return {"message": f"Processed {len(processed)} live Google Calendar meetings successfully.", "count": len(processed)}

@router.post("/add")
def add_new_meeting(req: NewMeetingRequest):
    raw_meetings = get_raw_meetings()
    employees = get_employees()
    projects = get_projects()
    
    new_raw = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "description": req.description,
        "start_time": datetime.datetime.utcnow().isoformat() + "Z",
        "duration_minutes": req.duration_minutes,
        "attendees": req.attendees
    }
    raw_meetings.append(new_raw)
    save_json("meetings_raw.json", raw_meetings)
    
    processed_meetings = get_processed_meetings()
    new_processed = process_single_meeting(new_raw, employees, projects)
    processed_meetings.append(new_processed)
    save_json("meetings_processed.json", processed_meetings)
    
    return {"message": "Meeting added and processed", "meeting": new_processed}

@router.post("/{meeting_id}/correct")
def correct_meeting(meeting_id: str, req: CorrectionRequest):
    processed = get_processed_meetings()
    found = False
    for m in processed:
        if m["id"] == meeting_id:
            m["project_id"] = req.project_id
            m["needs_review"] = False
            m["is_anomaly"] = False
            found = True
            break
            
    if not found:
        raise HTTPException(status_code=404, detail="Meeting not found")
        
    save_json("meetings_processed.json", processed)
    return {"message": "Meeting updated successfully"}
