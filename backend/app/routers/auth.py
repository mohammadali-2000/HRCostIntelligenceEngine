import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

router = APIRouter()

CLIENT_SECRETS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "client_secret.json")
TOKEN_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "token.json")
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

oauth_state_store = {}

@router.get("/login")
def login():
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=500, detail="client_secret.json not found. Please create it first.")
        
    # Use Flow to get authorization url
    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri='https://hrcostintelligenceengine.onrender.com/api/auth/callback'
    )
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    
    oauth_state_store[state] = getattr(flow, 'code_verifier', None)
    
    return RedirectResponse(url=authorization_url)

@router.get("/callback")
def callback(state: str, code: str):
    if not os.path.exists(CLIENT_SECRETS_FILE):
        raise HTTPException(status_code=500, detail="client_secret.json not found.")

    flow = Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE,
        scopes=SCOPES,
        redirect_uri='https://hrcostintelligenceengine.onrender.com/api/auth/callback',
        state=state
    )
    
    code_verifier = oauth_state_store.get(state)
    if code_verifier:
        flow.code_verifier = code_verifier
        
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    with open(TOKEN_FILE, 'w') as f:
        f.write(credentials.to_json())
        
    from app.services import sync_token_to_cloud
    sync_token_to_cloud(TOKEN_FILE)
        
    return RedirectResponse(url='https://hr-cost-intelligence-engine-five.vercel.app')
