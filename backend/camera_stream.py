import cv2
import threading
import time

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

import uvicorn


# =========================================================
# CAMERA STREAM SERVER
# =========================================================

app = FastAPI(
    title="Virtual Classroom Camera Stream"
)


app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =========================================================
# CAMERA
# =========================================================

camera = cv2.VideoCapture(0)

camera.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    640
)

camera.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    480
)


if not camera.isOpened():

    raise RuntimeError(
        "Could not open webcam."
    )


camera_lock = threading.Lock()


# =========================================================
# FRAME GENERATOR
# =========================================================

def generate_frames():

    while True:

        with camera_lock:

            success, frame = camera.read()


        if not success:

            time.sleep(0.05)

            continue


        frame = cv2.flip(
            frame,
            1
        )


        success, encoded = cv2.imencode(
            ".jpg",
            frame,
            [
                cv2.IMWRITE_JPEG_QUALITY,
                80
            ]
        )


        if not success:

            continue


        frame_bytes = encoded.tobytes()


        yield (

            b"--frame\r\n"

            b"Content-Type: image/jpeg\r\n\r\n"

            + frame_bytes

            + b"\r\n"

        )


# =========================================================
# VIDEO ENDPOINT
# =========================================================

@app.get("/video_feed")
def video_feed():

    return StreamingResponse(

        generate_frames(),

        media_type=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        )

    )


# =========================================================
# STATUS
# =========================================================

@app.get("/")
def root():

    return {

        "status": "online",

        "camera": camera.isOpened(),

        "stream":
            "/video_feed"

    }


# =========================================================
# SERVER
# =========================================================

if __name__ == "__main__":

    print()
    print(
        "============================================"
    )

    print(
        " VIRTUAL CLASSROOM CAMERA STREAM"
    )

    print(
        "============================================"
    )

    print(
        "Stream:"
    )

    print(
        "http://127.0.0.1:8001/video_feed"
    )

    print()

    uvicorn.run(

        app,

        host="127.0.0.1",

        port=8001

    )