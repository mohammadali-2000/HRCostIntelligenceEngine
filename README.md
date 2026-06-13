# HR Cost Intelligence Engine - AI Hackathon 2025 MVP

An intelligent system that transforms the modern workplace by converting calendar meetings into real-time HR cost insights. This project addresses Problem Statement #1: "HR Cost Intelligence Engine".

## Features
- **AI-Powered Attribution**: Uses Gemini 1.5 Flash to intelligently map raw calendar meetings to specific company projects based on titles, descriptions, and context.
- **Real-Time Cost Dashboard**: Visualizes HR expenditure per project, highlighting where your team's time (and budget) is really going.
- **Anomaly Detection**: Flags meetings that are unusually expensive or have ambiguous context, allowing human review.
- **Privacy Mode**: Built-in toggle to obscure actual currency amounts, allowing safe presentation of the dashboard in public settings.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS v4, Recharts, Lucide React
- **Backend**: FastAPI (Python), Uvicorn, Pydantic
- **AI Provider**: Google Gemini API
- **Data Storage**: Local JSON files (simulating a database for MVP purposes)

## Folder Structure
- `/backend`: The FastAPI application and mock data JSONs.
- `/frontend`: The React SPA dashboard.

## Setup Instructions (Runnable in < 10 Minutes)

### 1. Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure Environment Variables:
   - Copy `.env.template` to `.env`
   - Open `.env` and add your Gemini API Key:
     `GEMINI_API_KEY=your_actual_key_here`
5. Run the server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *(The API will be available at http://localhost:8000)*

### 2. Frontend Setup
1. Open a new terminal window and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *(The Dashboard will be available at http://localhost:5173)*

## How to use the MVP
1. Open the frontend in your browser.
2. Initially, the dashboard will be empty. Click **"Trigger AI Ingestion"** in the top right.
3. The backend will read `backend/data/meetings_raw.json`, process each meeting through Gemini to determine the `project_id`, calculate costs based on attendees in `employees.json`, and output to `meetings_processed.json`.
4. The dashboard will automatically update with the cost breakdown, charts, and AI-generated anomaly insights.
5. Navigate to the **"Review Queue"** tab in the sidebar to manually review any meetings the AI flagged as low-confidence or anomalous.
