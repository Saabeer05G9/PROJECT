--- /tmp/original_main.js	2026-09-01 06:07:59.564584079 +0000
+++ /home/claude/project_review/PROJECT-main/src/main.js	2026-09-01 06:07:44.420172642 +0000
@@ -2674,6 +2674,9 @@
 const GESTURE_API_URL =
     "http://127.0.0.1:8000/gesture";
 
+const GESTURE_CLEAR_API_URL =
+    "http://127.0.0.1:8000/gesture/clear";
+
 
 let gesturePollingActive = false;
 
@@ -2822,6 +2825,29 @@
     }
 
 
+    /*
+       GUARD:
+
+       The backend keeps returning the same
+       "last_gesture" on every 150ms poll until
+       it is explicitly cleared. Without this
+       guard, a single swipe would trigger
+       goToSlide() repeatedly (once per poll)
+       instead of once.
+
+       Only act the first time a given gesture
+       value is seen; ignore repeats of the same
+       value until it changes (poll loop resets
+       this to "NONE" once the backend clears).
+    */
+
+    if (gesture === lastDisplayedGesture) {
+
+        return;
+
+    }
+
+
     lastDisplayedGesture =
         gesture;
 
@@ -2865,14 +2891,20 @@
 
 
     /*
-       IMPORTANT:
-
-       No action is assigned yet.
-
-       This only displays the
-       recognized gesture.
+       Tell the backend this gesture has been
+       consumed so it stops reporting it on
+       subsequent polls. Fire-and-forget: a
+       failure here just means the local guard
+       above still prevents a repeat action.
     */
 
+    fetch(
+        GESTURE_CLEAR_API_URL,
+        { method: "POST" }
+    ).catch(
+        () => {}
+    );
+
 }
 
 /* =========================================================
@@ -2947,6 +2979,21 @@
 
         }
 
+        else {
+
+            /*
+               Backend has no active gesture.
+               Reset the guard so the next
+               swipe (even a repeat of the
+               previous direction) is not
+               ignored as a duplicate.
+            */
+
+            lastDisplayedGesture =
+                "NONE";
+
+        }
+
     }
 
     catch (
