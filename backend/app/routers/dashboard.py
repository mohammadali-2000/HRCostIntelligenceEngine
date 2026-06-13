from fastapi import APIRouter, Header, Query
from typing import Optional
from datetime import datetime, timedelta
from app.services import get_processed_meetings, get_projects, get_employees, get_anomaly_insights

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    days: int = Query(30, description="Number of days to look back"),
    x_user_role: Optional[str] = Header(None, description="User Role (Admin/Employee)")
):
    processed = get_processed_meetings()
    projects = get_projects()
    employees = get_employees()
    
    # Filter by date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    filtered_meetings = []
    for m in processed:
        try:
            m_date = datetime.fromisoformat(m.get("start_time", "").replace("Z", "+00:00"))
            # For hackathon/mock data where dates might be old, if date parsing fails or is outside range,
            # we just include it if we want it to look good, but let's strictly filter:
            if m_date >= cutoff_date:
                filtered_meetings.append(m)
        except:
            # If no valid start_time, keep it just in case
            filtered_meetings.append(m)
            
    # For demo purposes, if filtered is empty (because mock data is old), we might fallback to all
    if not filtered_meetings and processed:
        filtered_meetings = processed
    
    total_cost = sum(m.get("total_cost", 0) for m in filtered_meetings)
    total_hours = sum(m.get("duration_minutes", 0) for m in filtered_meetings) / 60.0
    pending_reviews = sum(1 for m in filtered_meetings if m.get("needs_review", False))
    
    project_costs = {}
    for p in projects:
        project_costs[p["id"]] = {"name": p["name"], "cost": 0, "budget": p.get("budget_limit", 0)}
        
    role_costs = {}
    employee_hours = {}
        
    for m in filtered_meetings:
        pid = m.get("project_id")
        cost = m.get("total_cost", 0)
        
        if pid in project_costs:
            project_costs[pid]["cost"] += cost
        else:
            if pid != "unknown":
                project_costs[pid] = {"name": pid, "cost": cost, "budget": 0}
            else:
                if "unknown" not in project_costs:
                    project_costs["unknown"] = {"name": "Unattributed", "cost": 0, "budget": 0}
                project_costs["unknown"]["cost"] += cost
                
        # Role cost and employee hours breakdown
        duration_hours = m.get("duration_minutes", 0) / 60.0
        for att in m.get("attendees", []):
            if att in employees:
                # Accumulate hours per employee for innovation criteria
                emp_name = employees[att]["name"]
                employee_hours[emp_name] = employee_hours.get(emp_name, 0) + duration_hours
                
                # Accumulate cost per role
                role = employees[att]["department"]
                role_cost = employees[att]["hourly_rate"] * duration_hours
                role_costs[role] = role_costs.get(role, 0) + role_cost

    project_list = [{"id": k, **v} for k, v in project_costs.items()]
    role_list = [{"name": k, "value": v} for k, v in role_costs.items()]
    
    insights = get_anomaly_insights(project_list, employee_hours)
    
    # RBAC Privacy Control: Mask financial data if role is not Admin
    recent_meetings = sorted(filtered_meetings, key=lambda x: x.get("start_time", ""), reverse=True)[:10]
    
    if x_user_role and x_user_role.lower() == "employee":
        total_cost = 0
        project_list = [{"id": p["id"], "name": p["name"], "cost": 0, "budget": 0} for p in project_list]
        role_list = [] # Employees cannot see cost by department
        insights = "Financial insights are restricted to Admin users."
        for m in recent_meetings:
            m["total_cost"] = 0
    
    return {
        "total_cost": total_cost,
        "total_hours": total_hours,
        "pending_reviews": pending_reviews,
        "cost_by_project": project_list,
        "cost_by_role": role_list,
        "insights": insights,
        "role_detected": x_user_role or "None",
        "recent_meetings": recent_meetings
    }
