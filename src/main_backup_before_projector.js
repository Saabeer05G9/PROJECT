import {
    PptxViewer,
    RECOMMENDED_ZIP_LIMITS
} from "@aiden0z/pptx-renderer";


/* =========================================================
   STATE
========================================================= */

let pptViewer = null;
let pptBuffer = null;

let currentSlide = 0;
let totalSlides = 0;

let thumbnailHandles = [];

let cameraStream = null;

let recognition = null;
let micActive = false;

let projectorWindow = null;


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (id) =>
    document.getElementById(id);


/* =========================================================
   CLOCK
========================================================= */

function updateClock() {

    const clock = $("clock");

    if (!clock) return;

    const now = new Date();

    clock.textContent =
        now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

}

updateClock();

setInterval(updateClock, 1000);


/* =========================================================
   3D TUBES BACKGROUND
========================================================= */

async function initializeTubes() {

    const canvas =
        $("tubes-canvas");

    if (!canvas) return;

    try {

        const module =
            await import(
                "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js"
            );

        const TubesCursor =
            module.default;

        TubesCursor(
            canvas,
            {
                tubes: {
                    colors: [
                        "#35e0a0"
                    ],

                    lights: {
                        intensity: 100,

                        colors: [
                            "#35e0a0"
                        ]
                    }
                }
            }
        );

    }

    catch (error) {

        console.warn(
            "3D background unavailable:",
            error
        );

    }

}

initializeTubes();


/* =========================================================
   CAMERA
========================================================= */

const camera =
    $("camera");

const startCamera =
    $("startCamera");

const stopCamera =
    $("stopCamera");

const cameraPlaceholder =
    $("cameraPlaceholder");

const cameraDot =
    $("cameraDot");

const cameraStatus =
    $("cameraStatus");

const liveTag =
    $("liveTag");


async function startCameraFunction() {

    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {

        alert(
            "Camera access is not available in this browser."
        );

        return;

    }


    try {

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    },

                    facingMode: "user"
                },

                audio: false

            });


        camera.srcObject =
            cameraStream;


        await camera.play();


        camera.style.display =
            "block";


        if (cameraPlaceholder) {

            cameraPlaceholder.style.display =
                "none";

        }


        if (liveTag) {

            liveTag.style.display =
                "block";

        }


        if (startCamera) {

            startCamera.disabled =
                true;

        }


        if (stopCamera) {

            stopCamera.disabled =
                false;

        }


        if (cameraDot) {

            cameraDot.classList.add(
                "active"
            );

        }


        if (cameraStatus) {

            cameraStatus.textContent =
                "LIVE";

        }

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        if (
            error.name ===
            "NotAllowedError"
        ) {

            alert(
                "Camera permission was denied. Click the camera icon in Chrome's address bar and allow camera access."
            );

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            alert(
                "No camera was found."
            );

        }

        else if (
            error.name ===
            "NotReadableError"
        ) {

            alert(
                "The camera is already being used by another application."
            );

        }

        else {

            alert(
                "Unable to start the camera."
            );

        }

    }

}


function stopCameraFunction() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                track => track.stop()
            );

    }


    cameraStream =
        null;


    if (camera) {

        camera.srcObject =
            null;

        camera.style.display =
            "none";

    }


    if (cameraPlaceholder) {

        cameraPlaceholder.style.display =
            "flex";

    }


    if (liveTag) {

        liveTag.style.display =
            "none";

    }


    if (startCamera) {

        startCamera.disabled =
            false;

    }


    if (stopCamera) {

        stopCamera.disabled =
            true;

    }


    if (cameraDot) {

        cameraDot.classList.remove(
            "active"
        );

    }


    if (cameraStatus) {

        cameraStatus.textContent =
            "OFFLINE";

    }

}


if (startCamera) {

    startCamera.addEventListener(
        "click",
        startCameraFunction
    );

}


if (stopCamera) {

    stopCamera.addEventListener(
        "click",
        stopCameraFunction
    );

}


/* =========================================================
   MICROPHONE / SPEECH RECOGNITION
========================================================= */

const startMic =
    $("startMic");

const stopMic =
    $("stopMic");

const micMiniStatus =
    $("micMiniStatus");

const transcript =
    $("transcript");


function addTranscript(text) {

    if (!transcript) return;

    const line =
        document.createElement("div");

    line.innerHTML = `
        <span class="transcript-time">
            [LIVE]
        </span>

        <span class="transcript-teacher">
            Teacher:
        </span>

        ${escapeHTML(text)}
    `;

    transcript.appendChild(line);

    transcript.scrollTop =
        transcript.scrollHeight;

}


function escapeHTML(text) {

    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function startMicrophone() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Speech recognition is not supported by this browser. Please use Google Chrome."
        );

        return;

    }


    if (micActive) return;


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        true;

    recognition.interimResults =
        false;

    recognition.lang =
        "en-US";


    recognition.onstart =
        () => {

            micActive =
                true;


            if (startMic) {

                startMic.disabled =
                    true;

            }


            if (stopMic) {

                stopMic.disabled =
                    false;

            }


            if (micMiniStatus) {

                micMiniStatus.textContent =
                    "LISTENING";

                micMiniStatus.classList.add(
                    "active"
                );

            }

        };


    recognition.onresult =
        event => {

            for (
                let i =
                    event.resultIndex;

                i <
                event.results.length;

                i++
            ) {

                if (
                    event.results[i].isFinal
                ) {

                    const text =
                        event.results[i][0]
                            .transcript
                            .trim();

                    if (text) {

                        addTranscript(
                            text
                        );

                    }

                }

            }

        };


    recognition.onerror =
        event => {

            console.warn(
                "Speech recognition error:",
                event.error
            );


            if (
                event.error ===
                "not-allowed"
            ) {

                micActive =
                    false;

                alert(
                    "Microphone permission was denied. Allow microphone access in Chrome."
                );

            }

        };


    recognition.onend =
        () => {

            if (micActive) {

                try {

                    recognition.start();

                }

                catch (error) {}

            }

        };


    try {

        recognition.start();

    }

    catch (error) {

        console.error(
            error
        );

    }

}


function stopMicrophone() {

    micActive =
        false;


    if (recognition) {

        try {

            recognition.stop();

        }

        catch (error) {}

    }


    recognition =
        null;


    if (startMic) {

        startMic.disabled =
            false;

    }


    if (stopMic) {

        stopMic.disabled =
            true;

    }


    if (micMiniStatus) {

        micMiniStatus.textContent =
            "OFFLINE";

        micMiniStatus.classList.remove(
            "active"
        );

    }

}


if (startMic) {

    startMic.addEventListener(
        "click",
        startMicrophone
    );

}


if (stopMic) {

    stopMic.addEventListener(
        "click",
        stopMicrophone
    );

}


/* =========================================================
   PPT ELEMENTS
========================================================= */

const upload =
    $("pptUpload");

const pptContainer =
    $("pptx-container");

const thumbnailContainer =
    $("thumbnail-container");

const presentationEmpty =
    $("presentationEmpty");

const presentationStatus =
    $("presentationStatus");

const presentationDot =
    $("presentationDot");

const slideNumber =
    $("slideNumber");

const slideCount =
    $("slideCount");

const currentSlideText =
    $("currentSlideText");

const presentationFileName =
    $("presentationFileName");

const previousSlide =
    $("previousSlide");

const nextSlide =
    $("nextSlide");


/* =========================================================
   PRESENTATION STATUS
========================================================= */

function setPresentationStatus(
    text,
    active = false
) {

    if (presentationStatus) {

        presentationStatus.textContent =
            text;

    }


    if (presentationDot) {

        presentationDot.classList.toggle(
            "active",
            active
        );

    }

}


/* =========================================================
   DESTROY OLD PPT VIEWER
========================================================= */

function destroyViewer() {

    if (pptViewer) {

        try {

            pptViewer.destroy();

        }

        catch (error) {

            console.warn(
                "Viewer cleanup:",
                error
            );

        }

    }


    pptViewer =
        null;


    thumbnailHandles.forEach(
        handle => {

            try {

                handle.dispose();

            }

            catch (error) {}

        }
    );


    thumbnailHandles =
        [];


    if (pptContainer) {

        pptContainer.innerHTML =
            "";

    }


    if (thumbnailContainer) {

        thumbnailContainer.innerHTML =
            "";

    }

}


/* =========================================================
   UPDATE SLIDE UI
========================================================= */

function updateSlideUI(
    index
) {

    currentSlide =
        index;


    const number =
        index + 1;


    if (slideNumber) {

        slideNumber.textContent =
            String(number)
                .padStart(2, "0");

    }


    if (slideCount) {

        slideCount.textContent =
            `${number} OF ${totalSlides}`;

    }


    if (currentSlideText) {

        currentSlideText.textContent =
            `${number} OF ${totalSlides}`;

    }


    if (previousSlide) {

        previousSlide.disabled =
            index <= 0;

    }


    if (nextSlide) {

        nextSlide.disabled =
            index >= totalSlides - 1;

    }


    highlightThumbnail();


    syncProjector();

}


/* =========================================================
   THUMBNAILS
========================================================= */

async function renderThumbnails() {

    if (!thumbnailContainer ||
        !pptViewer) {

        return;

    }


    thumbnailContainer.innerHTML =
        "";


    thumbnailHandles.forEach(
        handle => {

            try {

                handle.dispose();

            }

            catch (error) {}

        }
    );


    thumbnailHandles =
        [];


    /*
       Show first 8 slides in the compact
       interface.
    */

    const count =
        Math.min(
            totalSlides,
            8
        );


    for (
        let index = 0;
        index < count;
        index++
    ) {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "ppt-thumbnail";


        button.dataset.index =
            index;


        button.type =
            "button";


        const preview =
            document.createElement(
                "div"
            );


        preview.className =
            "ppt-thumbnail-preview";


        button.appendChild(
            preview
        );


        button.addEventListener(
            "click",
            () => {

                goToSlide(
                    index
                );

            }
        );


        thumbnailContainer.appendChild(
            button
        );


        try {

            const handle =
                pptViewer.renderThumbnailToContainer(
                    index,
                    preview,
                    {
                        width: 110
                    }
                );


            thumbnailHandles.push(
                handle
            );


            if (handle?.ready) {

                await handle.ready;

            }

        }

        catch (error) {

            console.warn(
                "Thumbnail error:",
                error
            );

        }

    }


    highlightThumbnail();

}


/* =========================================================
   THUMBNAIL ACTIVE STATE
========================================================= */

function highlightThumbnail() {

    document
        .querySelectorAll(
            ".ppt-thumbnail"
        )
        .forEach(
            thumbnail => {

                const index =
                    Number(
                        thumbnail.dataset.index
                    );


                thumbnail.classList.toggle(
                    "active",
                    index === currentSlide
                );

            }
        );

}


/* =========================================================
   GO TO SLIDE
========================================================= */

async function goToSlide(
    index
) {

    if (!pptViewer ||
        totalSlides === 0) {

        return;

    }


    const target =
        Math.max(
            0,
            Math.min(
                index,
                totalSlides - 1
            )
        );


    try {

        await pptViewer.goToSlide(
            target
        );


        currentSlide =
            target;


        updateSlideUI(
            target
        );

    }

    catch (error) {

        console.error(
            "Slide navigation error:",
            error
        );

    }

}


/* =========================================================
   BUTTON NAVIGATION
========================================================= */

if (previousSlide) {

    previousSlide.addEventListener(
        "click",
        () => {

            goToSlide(
                currentSlide - 1
            );

        }
    );

}


if (nextSlide) {

    nextSlide.addEventListener(
        "click",
        () => {

            goToSlide(
                currentSlide + 1
            );

        }
    );

}


/* =========================================================
   KEYBOARD NAVIGATION
   IMPORTANT:
   CAPTURE PHASE = true
========================================================= */

window.addEventListener(
    "keydown",
    event => {

        /*
           Ignore keys when user is typing
           into an actual input field.
        */

        const target =
            event.target;


        const tag =
            target?.tagName;


        if (
            tag === "INPUT" &&
            target.type !== "file"
        ) {

            return;

        }


        if (
            tag === "TEXTAREA" ||
            target?.isContentEditable
        ) {

            return;

        }


        if (
            event.key === "ArrowRight" ||
            event.key === "PageDown"
        ) {

            event.preventDefault();

            event.stopPropagation();

            goToSlide(
                currentSlide + 1
            );

        }


        else if (
            event.key === "ArrowLeft" ||
            event.key === "PageUp"
        ) {

            event.preventDefault();

            event.stopPropagation();

            goToSlide(
                currentSlide - 1
            );

        }


        else if (
            event.key === "Home"
        ) {

            event.preventDefault();

            goToSlide(
                0
            );

        }


        else if (
            event.key === "End"
        ) {

            event.preventDefault();

            goToSlide(
                totalSlides - 1
            );

        }

    },
    true
);


/* =========================================================
   PPTX LOAD
========================================================= */

async function loadPowerPoint(
    file
) {

    if (!file)
        return;


    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    if (extension !== "pptx") {

        alert(
            "Please use a .PPTX file for browser presentation preview."
        );

        return;

    }


    setPresentationStatus(
        "LOADING",
        false
    );


    if (presentationFileName) {

        presentationFileName.textContent =
            file.name;

    }


    if (presentationEmpty) {

        presentationEmpty.style.display =
            "none";

    }


    destroyViewer();


    try {

        const buffer =
            await file.arrayBuffer();


        /*
           Keep a copy for projector mode.
        */

        pptBuffer =
            buffer.slice(0);


        /*
           Browser-native PPTX renderer.
        */

        pptViewer =
            await PptxViewer.open(
                buffer,
                pptContainer,
                {
                    renderMode: "slide",

                    fitMode: "contain",

                    zipLimits:
                        RECOMMENDED_ZIP_LIMITS
                }
            );


        totalSlides =
            pptViewer.slideCount;


        if (
            totalSlides <= 0
        ) {

            throw new Error(
                "No slides found."
            );

        }


        currentSlide =
            0;


        setPresentationStatus(
            "READY",
            true
        );


        updateSlideUI(
            0
        );


        await renderThumbnails();


        /*
           Listen for renderer slide changes.
        */

        pptViewer.addEventListener(
            "slidechange",
            event => {

                if (
                    typeof event.detail?.index ===
                    "number"
                ) {

                    currentSlide =
                        event.detail.index;

                    updateSlideUI(
                        currentSlide
                    );

                }

            }
        );


        syncProjector();


        console.log(
            `Presentation loaded: ${totalSlides} slides`
        );

    }

    catch (error) {

        console.error(
            "PPTX rendering failed:",
            error
        );


        destroyViewer();


        pptBuffer =
            null;

        totalSlides =
            0;

        currentSlide =
            0;


        if (presentationEmpty) {

            presentationEmpty.style.display =
                "flex";

        }


        setPresentationStatus(
            "ERROR",
            false
        );


        alert(
            "Unable to render this PPTX file. Try saving it again from PowerPoint as a standard .PPTX file."
        );

    }

}


if (upload) {

    upload.addEventListener(
        "change",
        event => {

            const file =
                event.target.files?.[0];

            loadPowerPoint(
                file
            );

        }
    );

}


/* =========================================================
   PROJECTOR WINDOW
========================================================= */

function openProjector() {

    if (
        projectorWindow &&
        !projectorWindow.closed
    ) {

        projectorWindow.focus();

        syncProjector();

        return;

    }


    projectorWindow =
        window.open(
            "",
            "VirtualClassroomProjector",
            [
                "width=1280",
                "height=720",
                "toolbar=no",
                "menubar=no",
                "location=no",
                "status=no",
                "resizable=yes"
            ].join(",")
        );


    if (!projectorWindow) {

        alert(
            "Chrome blocked the projector window. Allow pop-ups for localhost."
        );

        return;

    }


    projectorWindow.document.write(`
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Presentation Only
</title>

<style>

* {
    box-sizing:border-box;
}

html,
body {

    width:100%;
    height:100%;

    margin:0;

    background:#050607;

    overflow:hidden;

}

body {

    display:flex;

    align-items:center;

    justify-content:center;

}

#projector {

    width:100%;
    height:100%;

    display:flex;

    align-items:center;

    justify-content:center;

    background:#050607;

}

#slide {

    width:100%;
    height:100%;

    display:flex;

    align-items:center;

    justify-content:center;

    overflow:hidden;

}

#slide > * {

    max-width:100% !important;
    max-height:100% !important;

}

.waiting {

    color:#35e0a0;

    font-family:
        monospace;

    font-size:18px;

    letter-spacing:.12em;

}

</style>

</head>

<body>

<div id="projector">

    <div class="waiting">
        WAITING FOR PRESENTATION
    </div>

</div>

<script>

window.addEventListener(
    "message",
    event => {

        if (!event.data)
            return;


        if (
            event.data.type ===
            "UPDATE_SLIDE"
        ) {

            const projector =
                document.getElementById(
                    "projector"
                );


            projector.innerHTML =
                event.data.html || "";

        }

    }
);

<\/script>

</body>

</html>
    `);


    projectorWindow.document.close();


    setTimeout(
        () => {

            syncProjector();

        },
        300
    );

}


/* =========================================================
   PROJECTOR SYNCHRONIZATION
========================================================= */

function syncProjector() {

    if (
        !projectorWindow ||
        projectorWindow.closed ||
        !pptBuffer ||
        !pptContainer
    ) {

        return;

    }


    try {

        const html =
            pptContainer.innerHTML;


        projectorWindow.postMessage(
            {
                type:
                    "UPDATE_SLIDE",

                html:
                    html,

                slide:
                    currentSlide
            },
            "*"
        );

    }

    catch (error) {

        console.warn(
            "Projector sync failed:",
            error
        );

    }

}


/* =========================================================
   PROJECTOR BUTTONS
========================================================= */

const presentationOnlyBtn =
    $("presentationOnlyBtn");

const fullInterfaceBtn =
    $("fullInterfaceBtn");


if (presentationOnlyBtn) {

    presentationOnlyBtn.addEventListener(
        "click",
        () => {

            if (!pptBuffer) {

                alert(
                    "Upload a PowerPoint presentation first."
                );

                return;

            }


            presentationOnlyBtn.classList.add(
                "active"
            );


            if (fullInterfaceBtn) {

                fullInterfaceBtn.classList.remove(
                    "active"
                );

            }


            openProjector();

        }
    );

}


if (fullInterfaceBtn) {

    fullInterfaceBtn.addEventListener(
        "click",
        () => {

            fullInterfaceBtn.classList.add(
                "active"
            );


            if (presentationOnlyBtn) {

                presentationOnlyBtn.classList.remove(
                    "active"
                );

            }


            if (
                projectorWindow &&
                !projectorWindow.closed
            ) {

                projectorWindow.close();

            }


            projectorWindow =
                null;

        }
    );

}


/* =========================================================
   INITIAL STATE
========================================================= */

setPresentationStatus(
    "NO FILE",
    false
);


if (previousSlide) {

    previousSlide.disabled =
        true;

}


if (nextSlide) {

    nextSlide.disabled =
        true;

}


console.log(
    "Virtual Classroom initialized."
);