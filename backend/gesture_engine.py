import math
import time
from collections import deque

import numpy as np


# =========================================================
# MEDIAPIPE LANDMARK INDEXES
# =========================================================

WRIST = 0

THUMB_CMC = 1
THUMB_MCP = 2
THUMB_IP = 3
THUMB_TIP = 4

INDEX_MCP = 5
INDEX_PIP = 6
INDEX_DIP = 7
INDEX_TIP = 8

MIDDLE_MCP = 9
MIDDLE_PIP = 10
MIDDLE_DIP = 11
MIDDLE_TIP = 12

RING_MCP = 13
RING_PIP = 14
RING_DIP = 15
RING_TIP = 16

PINKY_MCP = 17
PINKY_PIP = 18
PINKY_DIP = 19
PINKY_TIP = 20


# =========================================================
# SETTINGS
# =========================================================

# Number of recent palm positions used for smoothing.
POSITION_HISTORY_SIZE = 6

# Minimum horizontal movement required for a swipe.
SWIPE_THRESHOLD = 0.85

# Horizontal movement must dominate vertical movement.
HORIZONTAL_RATIO = 1.5

# Minimum number of movement samples before swipe detection.
MIN_SAMPLES = 4

# Prevent repeated swipes.
SWIPE_COOLDOWN = 0.9


# =========================================================
# LANDMARK CONVERSION
# =========================================================

def landmarks_to_numpy(landmarks):

    return np.array(
        [
            [
                landmark.x,
                landmark.y,
                landmark.z
            ]
            for landmark in landmarks
        ],
        dtype=np.float32
    )


# =========================================================
# DISTANCE
# =========================================================

def distance(
    landmarks,
    point_a,
    point_b
):

    return float(
        np.linalg.norm(
            landmarks[point_a] -
            landmarks[point_b]
        )
    )


# =========================================================
# ANGLE
# =========================================================

def angle(
    point_a,
    point_b,
    point_c
):

    vector_a = (
        point_a -
        point_b
    )

    vector_c = (
        point_c -
        point_b
    )

    norm_a = np.linalg.norm(
        vector_a
    )

    norm_c = np.linalg.norm(
        vector_c
    )

    if (
        norm_a < 1e-6 or
        norm_c < 1e-6
    ):

        return 0.0

    cosine = np.dot(
        vector_a,
        vector_c
    ) / (
        norm_a *
        norm_c
    )

    cosine = np.clip(
        cosine,
        -1.0,
        1.0
    )

    return math.degrees(
        math.acos(cosine)
    )


# =========================================================
# FINGER EXTENSION
# =========================================================

def is_finger_extended(
    landmarks,
    mcp,
    pip,
    dip,
    tip
):

    pip_angle = angle(
        landmarks[mcp],
        landmarks[pip],
        landmarks[dip]
    )

    dip_angle = angle(
        landmarks[pip],
        landmarks[dip],
        landmarks[tip]
    )

    return (
        pip_angle > 155.0 and
        dip_angle > 150.0
    )


# =========================================================
# THUMB EXTENSION
# =========================================================

def is_thumb_extended(
    landmarks
):

    thumb_angle = angle(
        landmarks[THUMB_MCP],
        landmarks[THUMB_IP],
        landmarks[THUMB_TIP]
    )

    thumb_length = distance(
        landmarks,
        THUMB_CMC,
        THUMB_TIP
    )

    palm_reference = distance(
        landmarks,
        WRIST,
        INDEX_MCP
    )

    return (
        thumb_angle > 145.0 and
        thumb_length >
        palm_reference * 0.55
    )


# =========================================================
# FINGER STATES
# =========================================================

def get_finger_states(
    landmarks
):

    return {

        "thumb":
            is_thumb_extended(
                landmarks
            ),

        "index":
            is_finger_extended(
                landmarks,
                INDEX_MCP,
                INDEX_PIP,
                INDEX_DIP,
                INDEX_TIP
            ),

        "middle":
            is_finger_extended(
                landmarks,
                MIDDLE_MCP,
                MIDDLE_PIP,
                MIDDLE_DIP,
                MIDDLE_TIP
            ),

        "ring":
            is_finger_extended(
                landmarks,
                RING_MCP,
                RING_PIP,
                RING_DIP,
                RING_TIP
            ),

        "pinky":
            is_finger_extended(
                landmarks,
                PINKY_MCP,
                PINKY_PIP,
                PINKY_DIP,
                PINKY_TIP
            )

    }


# =========================================================
# FINGER COUNT
# =========================================================

def count_extended_fingers(
    finger_states
):

    return sum(
        finger_states.values()
    )


# =========================================================
# PALM CENTER
# =========================================================

def get_palm_center(
    landmarks
):

    palm_points = landmarks[
        [
            WRIST,
            INDEX_MCP,
            MIDDLE_MCP,
            RING_MCP,
            PINKY_MCP
        ]
    ]

    return np.mean(
        palm_points,
        axis=0
    )


# =========================================================
# HAND SIZE
# =========================================================

def get_hand_size(
    landmarks
):

    return distance(
        landmarks,
        WRIST,
        MIDDLE_TIP
    )


# =========================================================
# STATIC GESTURE
# =========================================================

def classify_static_gesture(
    finger_states
):

    thumb = finger_states["thumb"]
    index = finger_states["index"]
    middle = finger_states["middle"]
    ring = finger_states["ring"]
    pinky = finger_states["pinky"]

    if (
        thumb and
        index and
        middle and
        ring and
        pinky
    ):

        return "OPEN_PALM"

    if (
        not thumb and
        not index and
        not middle and
        not ring and
        not pinky
    ):

        return "FIST"

    if (
        index and
        not middle and
        not ring and
        not pinky
    ):

        return "INDEX_POINT"

    if (
        index and
        middle and
        not ring and
        not pinky
    ):

        return "TWO_FINGERS"

    if (
        index and
        middle and
        ring and
        not pinky
    ):

        return "THREE_FINGERS"

    return "UNKNOWN"


# =========================================================
# GESTURE ENGINE
# =========================================================

class GestureEngine:

    def __init__(self):

        self.previous_landmarks = None

        self.previous_center = None

        self.position_history = deque(
            maxlen=POSITION_HISTORY_SIZE
        )

        self.swipe_active = False

        self.last_swipe_time = 0.0

        self.cooldown = SWIPE_COOLDOWN


    # =====================================================
    # RESET
    # =====================================================

    def reset_tracking(self):

        self.previous_landmarks = None

        self.previous_center = None

        self.position_history.clear()

        self.swipe_active = False

        self.last_swipe_time = 0.0


    # =====================================================
    # SMOOTH PALM POSITION
    # =====================================================

    def get_smoothed_center(
        self,
        center
    ):

        self.position_history.append(
            center.copy()
        )

        positions = np.array(
            self.position_history,
            dtype=np.float32
        )

        return np.mean(
            positions,
            axis=0
        )


    # =====================================================
    # SWIPE DETECTION
    # =====================================================

    def detect_swipe(
        self,
        landmarks,
        finger_states
    ):

        current_center = (
            get_palm_center(
                landmarks
            )
        )

        smoothed_center = (
            self.get_smoothed_center(
                current_center
            )
        )

        hand_size = get_hand_size(
            landmarks
        )

        if hand_size < 0.0001:

            hand_size = 0.0001


        # -------------------------------------------------
        # ONLY OPEN PALM CAN START A SWIPE
        # -------------------------------------------------

        open_palm = all(
            finger_states.values()
        )


        if not open_palm:

            self.swipe_active = False

            return None, 0.0


        current_time = time.monotonic()


        # -------------------------------------------------
        # COOLDOWN
        # -------------------------------------------------

        if (
            current_time -
            self.last_swipe_time
            <
            self.cooldown
        ):

            return None, 0.0


        # -------------------------------------------------
        # START TRACKING
        # -------------------------------------------------

        if not self.swipe_active:

            self.swipe_active = True

            return None, 0.0


        # -------------------------------------------------
        # NEED ENOUGH POSITION SAMPLES
        # -------------------------------------------------

        if len(
            self.position_history
        ) < MIN_SAMPLES:

            return None, 0.0


        # -------------------------------------------------
        # USE OLDEST AND NEWEST SMOOTHED POSITIONS
        # -------------------------------------------------

        oldest = (
            self.position_history[0]
        )

        newest = (
            smoothed_center
        )


        dx = (
            float(newest[0] - oldest[0])
            /
            hand_size
        )


        dy = (
            float(newest[1] - oldest[1])
            /
            hand_size
        )


        # -------------------------------------------------
        # IGNORE SMALL MOVEMENT
        # -------------------------------------------------

        if abs(dx) < 0.08:

            return None, dx


        # -------------------------------------------------
        # REQUIRE HORIZONTAL MOVEMENT
        # -------------------------------------------------

        if (
            abs(dx)
            <
            abs(dy) *
            HORIZONTAL_RATIO
        ):

            return None, dx


        # -------------------------------------------------
        # RIGHT
        # -------------------------------------------------

        if dx >= SWIPE_THRESHOLD:

            self.last_swipe_time = (
                current_time
            )

            self.swipe_active = False

            self.position_history.clear()

            return "SWIPE_RIGHT", dx


        # -------------------------------------------------
        # LEFT
        # -------------------------------------------------

        if dx <= -SWIPE_THRESHOLD:

            self.last_swipe_time = (
                current_time
            )

            self.swipe_active = False

            self.position_history.clear()

            return "SWIPE_LEFT", dx


        return None, dx


    # =====================================================
    # PROCESS HAND
    # =====================================================

    def process_hand(
        self,
        landmarks
    ):

        current_landmarks = (
            landmarks_to_numpy(
                landmarks
            )
        )


        finger_states = (
            get_finger_states(
                current_landmarks
            )
        )


        finger_count = (
            count_extended_fingers(
                finger_states
            )
        )


        static_gesture = (
            classify_static_gesture(
                finger_states
            )
        )


        movement = None


        if self.previous_landmarks is not None:

            previous_center = (
                get_palm_center(
                    self.previous_landmarks
                )
            )

            current_center = (
                get_palm_center(
                    current_landmarks
                )
            )

            hand_size = get_hand_size(
                current_landmarks
            )

            if hand_size < 0.0001:

                hand_size = 0.0001


            dx = (
                current_center[0]
                -
                previous_center[0]
            ) / hand_size


            dy = (
                current_center[1]
                -
                previous_center[1]
            ) / hand_size


            movement = {

                "dx":
                    float(dx),

                "dy":
                    float(dy),

                "distance":
                    float(
                        math.sqrt(
                            dx * dx +
                            dy * dy
                        )
                    )

            }


        # -------------------------------------------------
        # SWIPE
        # -------------------------------------------------

        swipe, swipe_progress = (
            self.detect_swipe(
                current_landmarks,
                finger_states
            )
        )


        # -------------------------------------------------
        # SAVE CURRENT FRAME
        # -------------------------------------------------

        self.previous_landmarks = (
            current_landmarks.copy()
        )

        self.previous_center = (
            get_palm_center(
                current_landmarks
            )
        )


        return {

            "landmarks":
                current_landmarks,

            "finger_states":
                finger_states,

            "finger_count":
                finger_count,

            "static_gesture":
                static_gesture,

            "movement":
                movement,

            "swipe":
                swipe,

            "swipe_progress":
                float(
                    swipe_progress
                )

        }


# =========================================================
# TEST
# =========================================================

if __name__ == "__main__":

    print(
        "Gesture Engine loaded successfully."
    )

    print(
        "Finger recognition enabled."
    )

    print(
        "Smoothed movement enabled."
    )

    print(
        "Stable swipe detection enabled."
    )