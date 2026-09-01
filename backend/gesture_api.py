from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel

import time


# =========================================================
# APPLICATION
# =========================================================

app = FastAPI(
    title="Virtual Classroom Gesture API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =========================================================
# LIVE RECOGNITION STATE
# =========================================================

recognition_state = {

    "active": False,

    "hands": 0,

    "hand1": "NONE",

    "hand2": "NONE",

    "gesture": "NONE",

    "movement": "CENTER",

    "finger_count_hand1": 0,

    "finger_count_hand2": 0,

    "timestamp": 0.0

}


# =========================================================
# LAST COMPLETED GESTURE
# =========================================================

last_gesture = "NONE"

last_gesture_time = 0.0


# =========================================================
# REQUEST MODELS
# =========================================================

class RecognitionRequest(BaseModel):

    active: bool = True

    hands: int = 0

    hand1: str = "NONE"

    hand2: str = "NONE"

    gesture: str = "NONE"

    movement: str = "CENTER"

    finger_count_hand1: int = 0

    finger_count_hand2: int = 0


class GestureRequest(BaseModel):

    gesture: str

    hand: int = 1

    confidence: float = 1.0


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {

        "status": "online",

        "service":
            "Virtual Classroom Gesture API",

        "recognition":
            recognition_state

    }


# =========================================================
# UPDATE LIVE RECOGNITION
# =========================================================

@app.post("/recognition")
def update_recognition(
    request: RecognitionRequest
):

    global recognition_state


    recognition_state = {

        "active":
            request.active,

        "hands":
            request.hands,

        "hand1":
            request.hand1,

        "hand2":
            request.hand2,

        "gesture":
            request.gesture,

        "movement":
            request.movement,

        "finger_count_hand1":
            request.finger_count_hand1,

        "finger_count_hand2":
            request.finger_count_hand2,

        "timestamp":
            time.time()

    }


    return {

        "success": True,

        "recognition":
            recognition_state

    }


# =========================================================
# GET LIVE RECOGNITION
# =========================================================

@app.get("/recognition")
def get_recognition():

    return recognition_state


# =========================================================
# GESTURE EVENT
# =========================================================

@app.post("/gesture")
def receive_gesture(
    request: GestureRequest
):

    global last_gesture

    global last_gesture_time


    gesture = (
        request.gesture
        .strip()
        .upper()
    )


    allowed_gestures = {

        "SWIPE_RIGHT",

        "SWIPE_LEFT"

    }


    if gesture not in allowed_gestures:

        return {

            "success": False,

            "message":
                "Unsupported gesture",

            "gesture":
                gesture

        }


    last_gesture = gesture

    last_gesture_time = time.time()


    print(
        f"GESTURE API: {gesture}"
    )


    return {

        "success": True,

        "gesture":
            gesture,

        "hand":
            request.hand,

        "confidence":
            request.confidence,

        "timestamp":
            last_gesture_time

    }


# =========================================================
# GET LAST GESTURE
# =========================================================

@app.get("/gesture")
def get_gesture():

    return {

        "gesture":
            last_gesture,

        "timestamp":
            last_gesture_time

    }


# =========================================================
# CLEAR GESTURE
# =========================================================

@app.post("/gesture/clear")
def clear_gesture():

    global last_gesture

    last_gesture = "NONE"


    return {

        "success": True,

        "gesture":
            "NONE"

    }


# =========================================================
# SERVER
# =========================================================

if __name__ == "__main__":

    import uvicorn


    print()

    print(
        "============================================"
    )

    print(
        " VIRTUAL CLASSROOM GESTURE API"
    )

    print(
        "============================================"
    )

    print(
        "Server: http://127.0.0.1:8000"
    )

    print(
        "Recognition: /recognition"
    )

    print(
        "Gesture: /gesture"
    )

    print(
        "Press CTRL+C to stop."
    )

    print()


    uvicorn.run(

        app,

        host="127.0.0.1",

        port=8000

    )