import cv2
import mediapipe as mp
import requests
import time
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from gesture_engine import GestureEngine


# =========================================================
# CONFIGURATION
# =========================================================

MODEL_PATH = "models/hand_landmarker.task"

WINDOW_NAME = "Virtual Classroom - Gesture Control"

MAX_HANDS = 2

GESTURE_API_URL = "http://127.0.0.1:8000/gesture"

API_COOLDOWN = 1.0


# =========================================================
# MEDIAPIPE
# =========================================================

base_options = python.BaseOptions(
    model_asset_path=MODEL_PATH
)

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=MAX_HANDS,
    min_hand_detection_confidence=0.6,
    min_hand_presence_confidence=0.6,
    min_tracking_confidence=0.6
)

hand_landmarker = (
    vision.HandLandmarker.create_from_options(
        options
    )
)


# =========================================================
# HAND CONNECTIONS
# =========================================================

HAND_CONNECTIONS = [

    (0, 1),
    (1, 2),
    (2, 3),
    (3, 4),

    (0, 5),
    (5, 6),
    (6, 7),
    (7, 8),

    (0, 9),
    (9, 10),
    (10, 11),
    (11, 12),

    (0, 13),
    (13, 14),
    (14, 15),
    (15, 16),

    (0, 17),
    (17, 18),
    (18, 19),
    (19, 20),

    (5, 9),
    (9, 13),
    (13, 17)
]


# =========================================================
# FINGER TIPS
# =========================================================

FINGER_TIPS = {

    "THUMB": 4,
    "INDEX": 8,
    "MIDDLE": 12,
    "RING": 16,
    "PINKY": 20

}


# =========================================================
# COLORS
# =========================================================

LANDMARK_COLOR = (
    255,
    220,
    80
)

CONNECTION_COLOR = (
    255,
    180,
    60
)

TEXT_COLOR = (
    255,
    220,
    80
)

SECONDARY_TEXT_COLOR = (
    190,
    200,
    210
)

PANEL_COLOR = (
    10,
    15,
    22
)

OPEN_COLOR = (
    100,
    255,
    180
)

CLOSED_COLOR = (
    150,
    150,
    160
)

SWIPE_COLOR = (
    255,
    255,
    255
)


# =========================================================
# CAMERA
# =========================================================

camera = cv2.VideoCapture(0)


if not camera.isOpened():

    print(
        "ERROR: Could not open webcam."
    )

    hand_landmarker.close()

    raise SystemExit


# =========================================================
# CAMERA RESOLUTION
# =========================================================

camera.set(
    cv2.CAP_PROP_FRAME_WIDTH,
    640
)

camera.set(
    cv2.CAP_PROP_FRAME_HEIGHT,
    480
)

# Read one test frame before starting the main loop.
test_success, test_frame = camera.read()

if not test_success or test_frame is None:

    print(
        "ERROR: Webcam opened but could not provide a frame."
    )

    camera.release()

    hand_landmarker.close()

    raise SystemExit

print(
    f"Camera ready: {test_frame.shape[1]}x{test_frame.shape[0]}"
)

# =========================================================
# GESTURE ENGINES
# =========================================================

gesture_engines = [

    GestureEngine(),

    GestureEngine()

]


# =========================================================
# API STATE
# =========================================================

last_api_gesture = None

last_api_time = 0.0
last_recognition_api_time = 0.0

RECOGNITION_API_INTERVAL = 0.15


# =========================================================
# DISPLAY STATE
# =========================================================

last_swipe = "NONE"

last_swipe_timer = 0


# =========================================================
# FPS
# =========================================================

previous_time = 0


# =========================================================
# STARTUP
# =========================================================

print()
print(
    "============================================"
)

print(
    " REAL-TIME INTELLIGENT VIRTUAL CLASSROOM"
)

print(
    " GESTURE RECOGNITION SYSTEM"
)

print(
    "============================================"
)

print(
    "Two-hand tracking: ENABLED"
)

print(
    "Finger identification: ENABLED"
)

print(
    "Smoothed movement: ENABLED"
)

print(
    "Stable swipe detection: ENABLED"
)

print(
    "FastAPI connection: ENABLED"
)

print(
    "PPT control: READY"
)

print(
    "Press Q to quit."
)

print()


# =========================================================
# SEND GESTURE TO FASTAPI
# =========================================================

# =========================================================
# SEND GESTURE EVENT TO FASTAPI
# =========================================================

def send_gesture_to_api(
    gesture,
    hand_number
):

    global last_api_gesture
    global last_api_time


    current_time = time.monotonic()


    # -----------------------------------------------------
    # Prevent duplicate gesture requests
    # -----------------------------------------------------

    if (
        gesture == last_api_gesture
        and
        current_time - last_api_time
        < API_COOLDOWN
    ):

        return


    try:

        response = requests.post(

            GESTURE_API_URL,

            json={

                "gesture":
                    gesture,

                "hand":
                    hand_number,

                "confidence":
                    1.0

            },

            timeout=0.5

        )


        if response.ok:

            print(
                f"API SENT: {gesture}"
            )

            last_api_gesture = gesture

            last_api_time = current_time

        else:

            print(
                "API ERROR:",
                response.status_code
            )


    except requests.RequestException as error:

        print(
            f"API CONNECTION ERROR: {error}"
        )


# =========================================================
# SEND LIVE RECOGNITION TO FASTAPI
# =========================================================

def send_recognition_to_api(
    gesture_results,
    detected_hands
):

    global last_recognition_api_time


    current_time = time.monotonic()


    # -----------------------------------------------------
    # Limit recognition updates
    # -----------------------------------------------------

    if (
        current_time -
        last_recognition_api_time
        <
        RECOGNITION_API_INTERVAL
    ):

        return


    last_recognition_api_time = (
        current_time
    )


    # -----------------------------------------------------
    # Default values
    # -----------------------------------------------------

    hand1 = "NONE"

    hand2 = "NONE"

    finger_count_hand1 = 0

    finger_count_hand2 = 0

    movement = "CENTER"


    # -----------------------------------------------------
    # HAND 1
    # -----------------------------------------------------

    if len(gesture_results) >= 1:

        hand1 = (
            gesture_results[0]
            ["static_gesture"]
        )

        finger_count_hand1 = (
            gesture_results[0]
            ["finger_count"]
        )


    # -----------------------------------------------------
    # HAND 2
    # -----------------------------------------------------

    if len(gesture_results) >= 2:

        hand2 = (
            gesture_results[1]
            ["static_gesture"]
        )

        finger_count_hand2 = (
            gesture_results[1]
            ["finger_count"]
        )


    # -----------------------------------------------------
    # MOVEMENT
    # -----------------------------------------------------

    if gesture_results:

        movement_data = (
            gesture_results[0]
            ["movement"]
        )


        if movement_data:

            dx = movement_data[
                "dx"
            ]


            if dx > 0.025:

                movement = "RIGHT"

            elif dx < -0.025:

                movement = "LEFT"

            else:

                movement = "CENTER"


    # -----------------------------------------------------
    # CURRENT GESTURE
    #
    # Recognition only.
    # No action mapping here.
    # -----------------------------------------------------

    current_gesture = "NONE"


    if last_swipe != "NONE":

        current_gesture = last_swipe

    elif gesture_results:

        current_gesture = hand1


    # -----------------------------------------------------
    # SEND TO FASTAPI
    # -----------------------------------------------------

    try:

        requests.post(

            "http://127.0.0.1:8000/recognition",

            json={

                "active":
                    True,

                "hands":
                    detected_hands,

                "hand1":
                    hand1,

                "hand2":
                    hand2,

                "gesture":
                    current_gesture,

                "movement":
                    movement,

                "finger_count_hand1":
                    finger_count_hand1,

                "finger_count_hand2":
                    finger_count_hand2

            },

            timeout=0.3

        )


    except requests.RequestException:

        pass


# =========================================================
# MAIN CAMERA LOOP
# =========================================================
# =========================================================
# LIVE CAMERA STREAM
# =========================================================

latest_jpeg_frame = None

latest_frame_lock = threading.Lock()


class CameraStreamHandler(
    BaseHTTPRequestHandler
):

    def do_GET(self):

        global latest_jpeg_frame


        if self.path != "/video_feed":

            self.send_response(404)

            self.end_headers()

            return


        self.send_response(200)

        self.send_header(
            "Content-Type",
            "multipart/x-mixed-replace; boundary=frame"
        )

        self.send_header(
            "Cache-Control",
            "no-cache"
        )

        self.send_header(
            "Connection",
            "keep-alive"
        )

        self.end_headers()


        try:

            while True:

                with latest_frame_lock:

                    frame_data = (
                        latest_jpeg_frame
                    )


                if frame_data is None:

                    time.sleep(0.03)

                    continue


                self.wfile.write(
                    b"--frame\r\n"
                )

                self.wfile.write(
                    b"Content-Type: image/jpeg\r\n\r\n"
                )

                self.wfile.write(
                    frame_data
                )

                self.wfile.write(
                    b"\r\n"
                )

                time.sleep(0.04)


        except (
            BrokenPipeError,
            ConnectionResetError
        ):

            pass


    def log_message(
        self,
        format,
        *args
    ):

        return


def start_camera_stream():

    server = ThreadingHTTPServer(

        (
            "127.0.0.1",
            8001
        ),

        CameraStreamHandler

    )


    print(
        "Camera stream:"
    )

    print(
        "http://127.0.0.1:8001/video_feed"
    )


    server.serve_forever()


# =========================================================
# START CAMERA STREAM SERVER
# =========================================================

stream_thread = threading.Thread(

    target=start_camera_stream,

    daemon=True

)

stream_thread.start()


# =========================================================
# MAIN CAMERA LOOP
# =========================================================
while True:

    success, frame = camera.read()


    if not success:

        print(
            "ERROR: Could not read frame."
        )

        break


    # -----------------------------------------------------
    # MIRROR CAMERA
    # -----------------------------------------------------

    frame = cv2.flip(
        frame,
        1
    )


    height, width, _ = frame.shape


    # -----------------------------------------------------
    # CONVERT BGR → RGB
    # -----------------------------------------------------

    rgb_frame = cv2.cvtColor(
        frame,
        cv2.COLOR_BGR2RGB
    )


    # -----------------------------------------------------
    # MEDIAPIPE IMAGE
    # -----------------------------------------------------

    mp_image = mp.Image(

        image_format=mp.ImageFormat.SRGB,

        data=rgb_frame

    )


    # -----------------------------------------------------
    # DETECT HANDS
    # -----------------------------------------------------

    result = (
        hand_landmarker.detect(
            mp_image
        )
    )


    detected_hands = 0

    gesture_results = []


    # =====================================================
    # PROCESS DETECTED HANDS
    # =====================================================

    if result.hand_landmarks:

        detected_hands = len(
            result.hand_landmarks
        )


        for hand_index, landmarks in enumerate(
            result.hand_landmarks
        ):

            if hand_index >= MAX_HANDS:

                break


            # -------------------------------------------------
            # GESTURE ENGINE
            # -------------------------------------------------

            analysis = (
                gesture_engines[
                    hand_index
                ].process_hand(
                    landmarks
                )
            )


            gesture_results.append(
                analysis
            )


            # -------------------------------------------------
            # SWIPE DETECTION
            # -------------------------------------------------

            swipe = analysis[
                "swipe"
            ]


            if swipe is not None:

                last_swipe = swipe

                last_swipe_timer = 30


                print(
                    f"GESTURE DETECTED: {swipe}"
                )


                # =============================================
                # SEND TO FASTAPI
                # =============================================

                send_gesture_to_api(

                    swipe,

                    hand_index + 1

                )


            # -------------------------------------------------
            # DRAW LANDMARKS
            # -------------------------------------------------

            for landmark in landmarks:

                x = int(
                    landmark.x * width
                )

                y = int(
                    landmark.y * height
                )


                x = max(
                    0,
                    min(
                        width - 1,
                        x
                    )
                )

                y = max(
                    0,
                    min(
                        height - 1,
                        y
                    )
                )


                cv2.circle(

                    frame,

                    (x, y),

                    6,

                    LANDMARK_COLOR,

                    -1,

                    cv2.LINE_AA

                )


            # -------------------------------------------------
            # DRAW HAND CONNECTIONS
            # -------------------------------------------------

            for start, end in HAND_CONNECTIONS:

                x1 = int(
                    landmarks[start].x *
                    width
                )

                y1 = int(
                    landmarks[start].y *
                    height
                )

                x2 = int(
                    landmarks[end].x *
                    width
                )

                y2 = int(
                    landmarks[end].y *
                    height
                )


                cv2.line(

                    frame,

                    (x1, y1),

                    (x2, y2),

                    CONNECTION_COLOR,

                    2,

                    cv2.LINE_AA

                )


            # -------------------------------------------------
            # HAND LABEL
            # -------------------------------------------------

            wrist = landmarks[0]


            wrist_x = int(
                wrist.x * width
            )

            wrist_y = int(
                wrist.y * height
            )


            cv2.putText(

                frame,

                f"HAND {hand_index + 1}",

                (
                    wrist_x + 12,
                    wrist_y - 15
                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.55,

                TEXT_COLOR,

                2,

                cv2.LINE_AA

            )


            # =================================================
            # FINGER LABELS
            # =================================================

            finger_states = analysis[
                "finger_states"
            ]


            for finger_name, tip_index in FINGER_TIPS.items():

                tip = landmarks[
                    tip_index
                ]


                tip_x = int(
                    tip.x * width
                )

                tip_y = int(
                    tip.y * height
                )


                is_open = (
                    finger_states[
                        finger_name.lower()
                    ]
                )


                finger_color = (

                    OPEN_COLOR

                    if is_open

                    else CLOSED_COLOR

                )


                if finger_name == "THUMB":

                    label_x = (
                        tip_x - 70
                    )

                    label_y = (
                        tip_y - 10
                    )

                elif finger_name == "PINKY":

                    label_x = (
                        tip_x + 10
                    )

                    label_y = (
                        tip_y + 12
                    )

                else:

                    label_x = (
                        tip_x + 10
                    )

                    label_y = (
                        tip_y - 10
                    )


                label_x = max(
                    5,
                    min(
                        width - 100,
                        label_x
                    )
                )


                label_y = max(
                    20,
                    min(
                        height - 5,
                        label_y
                    )
                )


                cv2.putText(

                    frame,

                    finger_name,

                    (
                        label_x,
                        label_y
                    ),

                    cv2.FONT_HERSHEY_SIMPLEX,

                    0.45,

                    finger_color,

                    1,

                    cv2.LINE_AA

                )
    # =====================================================
    # SEND LIVE RECOGNITION STATE
    # =====================================================

    send_recognition_to_api(

        gesture_results,

        detected_hands

    )


    # =====================================================
    # FPS
    # =====================================================
    current_time = cv2.getTickCount()


    if previous_time != 0:

        fps = (

            cv2.getTickFrequency()

            /

            (
                current_time -
                previous_time
            )

        )

    else:

        fps = 0


    previous_time = current_time


    # =====================================================
    # SWIPE DISPLAY TIMER
    # =====================================================

    if last_swipe_timer > 0:

        last_swipe_timer -= 1

    else:

        last_swipe = "NONE"


    # =====================================================
    # TOP STATUS PANEL
    # =====================================================

    overlay = frame.copy()


    cv2.rectangle(

        overlay,

        (0, 0),

        (width, 80),

        PANEL_COLOR,

        -1

    )


    frame = cv2.addWeighted(

        overlay,

        0.82,

        frame,

        0.18,

        0

    )


    if detected_hands > 0:

        status_text = (
            "GESTURE TRACKING ACTIVE"
        )

        status_color = TEXT_COLOR

    else:

        status_text = (
            "WAITING FOR HAND"
        )

        status_color = SECONDARY_TEXT_COLOR


    cv2.putText(

        frame,

        status_text,

        (25, 32),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.7,

        status_color,

        2,

        cv2.LINE_AA

    )


    cv2.putText(

        frame,

        f"HANDS: {detected_hands}/2",

        (25, 62),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.55,

        SECONDARY_TEXT_COLOR,

        1,

        cv2.LINE_AA

    )


    cv2.putText(

        frame,

        f"FPS: {fps:.1f}",

        (
            width - 130,
            35
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.55,

        SECONDARY_TEXT_COLOR,

        1,

        cv2.LINE_AA

    )


    # =====================================================
    # MOVEMENT METER
    # =====================================================

    meter_x = 30

    meter_y = height - 105

    meter_width = 430

    meter_height = 22


    cv2.putText(

        frame,

        "HORIZONTAL MOVEMENT",

        (
            meter_x,
            meter_y - 15
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.5,

        SECONDARY_TEXT_COLOR,

        1,

        cv2.LINE_AA

    )


    movement_value = 0.0


    if gesture_results:

        analysis = gesture_results[0]


        if analysis["movement"] is not None:

            movement_value = (
                analysis[
                    "movement"
                ]["dx"]
            )


    visual_value = max(

        -1.0,

        min(

            1.0,

            movement_value * 4.0

        )

    )


    center_x = (

        meter_x +

        meter_width // 2

    )


    # -----------------------------------------------------
    # Meter background
    # -----------------------------------------------------

    cv2.rectangle(

        frame,

        (
            meter_x,
            meter_y
        ),

        (
            meter_x +
            meter_width,

            meter_y +
            meter_height
        ),

        PANEL_COLOR,

        -1

    )


    # -----------------------------------------------------
    # Center line
    # -----------------------------------------------------

    cv2.line(

        frame,

        (
            center_x,
            meter_y - 5
        ),

        (
            center_x,
            meter_y +
            meter_height +
            5
        ),

        SECONDARY_TEXT_COLOR,

        2

    )


    # -----------------------------------------------------
    # Movement marker
    # -----------------------------------------------------

    marker_x = int(

        center_x +

        visual_value *

        (
            meter_width // 2
            - 10
        )

    )


    marker_x = max(

        meter_x + 5,

        min(

            meter_x +
            meter_width -
            5,

            marker_x

        )

    )


    cv2.circle(

        frame,

        (
            marker_x,

            meter_y +
            meter_height // 2

        ),

        8,

        TEXT_COLOR,

        -1

    )


    # -----------------------------------------------------
    # Direction
    # -----------------------------------------------------

    if movement_value > 0.025:

        direction_text = "RIGHT"

    elif movement_value < -0.025:

        direction_text = "LEFT"

    else:

        direction_text = "CENTER"


    cv2.putText(

        frame,

        direction_text,

        (
            meter_x +
            meter_width +
            15,

            meter_y +
            17
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.48,

        TEXT_COLOR,

        1,

        cv2.LINE_AA

    )


    # =====================================================
    # LAST GESTURE
    # =====================================================

    cv2.putText(

        frame,

        f"LAST GESTURE: {last_swipe}",

        (
            30,
            height - 30
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        SWIPE_COLOR,

        2,

        cv2.LINE_AA

    )


    # =====================================================
    # DIAGNOSTIC PANEL
    # =====================================================

    panel_x = width - 330

    panel_y = 100

    panel_width = 310

    panel_height = 300


    overlay = frame.copy()


    cv2.rectangle(

        overlay,

        (
            panel_x,
            panel_y
        ),

        (
            panel_x +
            panel_width,

            panel_y +
            panel_height
        ),

        PANEL_COLOR,

        -1

    )


    frame = cv2.addWeighted(

        overlay,

        0.88,

        frame,

        0.12,

        0

    )


    cv2.putText(

        frame,

        "GESTURE DIAGNOSTICS",

        (
            panel_x + 15,
            panel_y + 28
        ),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.55,

        TEXT_COLOR,

        2,

        cv2.LINE_AA

    )


    diagnostic_y = (
        panel_y + 58
    )


    if gesture_results:

        for hand_index, analysis in enumerate(
            gesture_results
        ):

            gesture_name = analysis[
                "static_gesture"
            ]

            finger_count = analysis[
                "finger_count"
            ]

            states = analysis[
                "finger_states"
            ]


            cv2.putText(

                frame,

                (
                    f"HAND {hand_index + 1}: "
                    f"{gesture_name}"
                ),

                (
                    panel_x + 15,
                    diagnostic_y
                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.45,

                TEXT_COLOR,

                1,

                cv2.LINE_AA

            )


            diagnostic_y += 22


            cv2.putText(

                frame,

                f"FINGERS: {finger_count}/5",

                (
                    panel_x + 15,
                    diagnostic_y
                ),

                cv2.FONT_HERSHEY_SIMPLEX,

                0.42,

                SECONDARY_TEXT_COLOR,

                1,

                cv2.LINE_AA

            )


            diagnostic_y += 22


            finger_order = [

                ("THUMB", "thumb"),

                ("INDEX", "index"),

                ("MIDDLE", "middle"),

                ("RING", "ring"),

                ("PINKY", "pinky")

            ]


            for finger_name, key in finger_order:

                state = (

                    "OPEN"

                    if states[key]

                    else "CLOSED"

                )


                state_color = (

                    OPEN_COLOR

                    if states[key]

                    else CLOSED_COLOR

                )


                cv2.putText(

                    frame,

                    f"{finger_name}: {state}",

                    (
                        panel_x + 15,
                        diagnostic_y
                    ),

                    cv2.FONT_HERSHEY_SIMPLEX,

                    0.38,

                    state_color,

                    1,

                    cv2.LINE_AA

                )


                diagnostic_y += 17


            diagnostic_y += 10


    else:

        cv2.putText(

            frame,

            "NO HAND DETECTED",

            (
                panel_x + 15,
                diagnostic_y
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.45,

            SECONDARY_TEXT_COLOR,

            1,

            cv2.LINE_AA

        )


    # =====================================================
    # UPDATE LIVE CAMERA STREAM
    # =====================================================

    stream_success, stream_buffer = cv2.imencode(
        ".jpg",
        frame,
        [
            cv2.IMWRITE_JPEG_QUALITY,
            80
        ]
    )


    if stream_success:

        with latest_frame_lock:

            latest_jpeg_frame = (
                stream_buffer.tobytes()
            )


    # =====================================================
    # DISPLAY
    # =====================================================

    cv2.imshow(

        WINDOW_NAME,

        frame

    )


    # =====================================================
    # KEYBOARD
    # =====================================================

    key = (

        cv2.waitKey(1)

        & 0xFF

    )


    if key == ord("q"):

        break

# =========================================================
# CLEANUP
# =========================================================

camera.release()

cv2.destroyAllWindows()

hand_landmarker.close()

print()

print(
    "Gesture recognition stopped."
)