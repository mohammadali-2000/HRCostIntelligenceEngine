from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import dashboard, meetings, auth

app = FastAPI(title="HR Cost Intelligence Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])

@app.get("/")
def root():
    return {"message": "HR Cost Intelligence Engine API is running"}
