from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="AiIdeathon API",
    description="FastAPI Backend for AiIdeathon",
    version="0.1.0",
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the AiIdeathon FastAPI Backend!",
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}
