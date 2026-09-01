/* =========================================================
   ELECTRON PROJECTOR MODE
========================================================= */

const isElectronProjector =
    window.location.search.includes(
        "projector=true"
    );
import {
    PptxViewer,
    RECOMMENDED_ZIP_LIMITS
} from "@aiden0z/pptx-renderer";


/* =========================================================
   DISPLAY MODE
========================================================= */

let displayMode =
    "FULL_INTERFACE";


/* =========================================================
   STATE
========================================================= */

let pptViewer = null;let pptBuffer = null;

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

    const isElectron =
        navigator.userAgent
            .toLowerCase()
            .includes("electron");


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

        /*
           Electron/Chromium can report a
           "network" error from Web Speech
           even when the microphone itself
           is working.

           Do not continuously spam the console
           or repeatedly restart recognition.
        */

        if (
            event.error ===
            "not-allowed"
        ) {

            micActive =
                false;

            alert(
                "Microphone permission was denied."
            );

            return;

        }


        if (
            event.error ===
            "network"
        ) {

            console.warn(
                "Speech recognition service unavailable."
            );

            return;

        }


        console.warn(
            "Speech recognition error:",
            event.error
        );

    };


    recognition.onend =
    () => {

        /*
           Chrome can continuously restart speech
           recognition.

           Electron's Chromium speech service can
           return a "network" error, so repeatedly
           restarting it creates an endless loop.
        */

        if (
            micActive &&
            !isElectron
        ) {

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


        syncProjector();

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
/* =========================================================
   PROJECTOR KEYBOARD RELAY
   Receives keyboard commands from the
   presentation-only projector window.
========================================================= */

window.addEventListener(
    "message",
    event => {

        if (!event.data) {
            return;
        }


        /*
           Ignore projector commands unless
           Presentation Only mode is active.
        */

        if (
            displayMode !==
            "PRESENTATION_ONLY"
        ) {

            return;

        }


        switch (
            event.data.type
        ) {

            case "PROJECTOR_NEXT":

                goToSlide(
                    currentSlide + 1
                );

                break;


            case "PROJECTOR_PREVIOUS":

                goToSlide(
                    currentSlide - 1
                );

                break;


            case "PROJECTOR_FIRST":

                goToSlide(
                    0
                );

                break;


            case "PROJECTOR_LAST":

                goToSlide(
                    totalSlides - 1
                );

                break;

        }

    }
);
/* =========================================================
   ELECTRON PROJECTOR COMMANDS
========================================================= */

if (
    window.electronAPI &&
    typeof window.electronAPI.onProjectorCommand ===
        "function"
) {

    window.electronAPI.onProjectorCommand(
        data => {

            if (!data) {
                return;
            }


            if (
                displayMode !==
                "PRESENTATION_ONLY"
            ) {

                return;

            }


            switch (
                data.command
            ) {

                case "NEXT":

                    goToSlide(
                        currentSlide + 1
                    );

                    break;


                case "PREVIOUS":

                    goToSlide(
                        currentSlide - 1
                    );

                    break;


                case "FIRST":

                    goToSlide(
                        0
                    );

                    break;


                case "LAST":

                    goToSlide(
                        totalSlides - 1
                    );

                    break;

            }

        }
    );

}

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
#projectorControls {

    position:
        fixed;

    right:
        18px;

    bottom:
        18px;

    z-index:
        100;

    opacity:
        0;

    transition:
        opacity .2s ease;

}


body:hover #projectorControls {

    opacity:
        1;

}


#fullscreenButton {

    height:
        34px;

    padding:
        0 14px;

    border:
        1px solid
        rgba(238,242,240,.18);

    border-radius:
        7px;

    background:
        rgba(5,6,7,.88);

    color:
        #eef2f0;

    font-family:
        monospace;

    font-size:
        9px;

    font-weight:
        600;

    cursor:
        pointer;

}


#fullscreenButton:hover {

    border-color:
        rgba(53,224,160,.6);

    color:
        #35e0a0;

}

</style>

</head>

<body>

<div id="projector">

    <div
        id="slide">

        <div class="waiting">
            WAITING FOR PRESENTATION
        </div>

    </div>


    <div
        id="projectorControls">

        <button
            id="fullscreenButton">

            FULLSCREEN

        </button>

    </div>

</div>
<script>
/*
   Relay keyboard commands from the
   projector window back to the
   main classroom window.
*/

window.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "ArrowRight" ||
            event.key === "PageDown"
        ) {

            event.preventDefault();

            window.opener.postMessage(
                {
                    type:
                        "PROJECTOR_NEXT"
                },
                "*"
            );

        }


        else if (
            event.key === "ArrowLeft" ||
            event.key === "PageUp"
        ) {

            event.preventDefault();

            window.opener.postMessage(
                {
                    type:
                        "PROJECTOR_PREVIOUS"
                },
                "*"
            );

        }


        else if (
            event.key === "Home"
        ) {

            event.preventDefault();

            window.opener.postMessage(
                {
                    type:
                        "PROJECTOR_FIRST"
                },
                "*"
            );

        }


        else if (
            event.key === "End"
        ) {

            event.preventDefault();

            window.opener.postMessage(
                {
                    type:
                        "PROJECTOR_LAST"
                },
                "*"
            );

        }

    }
);
const fullscreenButton =
    document.getElementById(
        "fullscreenButton"
    );


if (fullscreenButton) {

    fullscreenButton.addEventListener(
        "click",
        async function() {

            try {

                if (
                    !document.fullscreenElement
                ) {

                    await document.documentElement
                        .requestFullscreen();

                    fullscreenButton.textContent =
                        "EXIT FULLSCREEN";

                }

                else {

                    await document.exitFullscreen();

                    fullscreenButton.textContent =
                        "FULLSCREEN";

                }

            }

            catch (error) {

                console.warn(
                    "Fullscreen failed:",
                    error
                );

            }

        }
    );

}

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
/*
   Electron projector receiver.

   The Electron main process sends the
   current slide through IPC.
*/

if (
    window.electronAPI &&
    typeof window.electronAPI.onProjectorSlide ===
        "function"
) {

    window.electronAPI.onProjectorSlide(
        data => {

            if (!data) {
                return;
            }


            const projector =
                document.getElementById(
                    "projector"
                );


            if (!projector) {
                return;
            }


            projector.innerHTML =
                data.html || "";

        }
    );

}

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
        displayMode !==
        "PRESENTATION_ONLY"
    ) {

        return;

    }


    /*
       A projector can be either:

       1. Browser projector window
       2. Electron projector window
    */

    const electronProjector =
        window.electronAPI &&
        typeof window.electronAPI.sendProjectorSlide ===
            "function";


    const browserProjector =
        projectorWindow &&
        !projectorWindow.closed;


    /*
       Nothing to synchronize with.
    */

    if (
        !electronProjector &&
        !browserProjector
    ) {

        return;

    }


    if (
        !pptBuffer ||
        !pptContainer
    ) {

        return;

    }


    try {

        const html =
            pptContainer.innerHTML;


        console.log(
            "ELECTRON PROJECTOR SYNC:",
            {
                slide:
                    currentSlide,

                htmlLength:
                    html.length,

                electronAPI:
                    !!electronProjector,

                browserProjector:
                    !!browserProjector
            }
        );


        /*
           ELECTRON PROJECTOR
        */

        if (
            electronProjector
        ) {

            window.electronAPI.sendProjectorSlide(
                {
                    html:
                        html,

                    slide:
                        currentSlide
                }
            );

        }


        /*
           BROWSER PROJECTOR
        */

        if (
            browserProjector
        ) {

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
const projectorStatus =
    $("projectorStatus");
function updateProjectorStatus(
    status
) {

    if (!projectorStatus) {
        return;
    }


    projectorStatus.textContent =
        status;


    projectorStatus.classList.remove(
        "active",
        "offline"
    );


    if (
        status ===
        "PROJECTOR ACTIVE"
    ) {

        projectorStatus.classList.add(
            "active"
        );

    }

    else {

        projectorStatus.classList.add(
            "offline"
        );

    }

}





            /* =========================================================
   DISPLAY MODE BUTTONS
========================================================= */

if (presentationOnlyBtn) {

    presentationOnlyBtn.addEventListener(
        "click",
        () => {

            /*
               Switch ONLY to presentation mode.
            */

            displayMode =
                "PRESENTATION_ONLY";


            presentationOnlyBtn.classList.add(
                "active"
            );


            if (fullInterfaceBtn) {

                fullInterfaceBtn.classList.remove(
                    "active"
                );

            }


            /*
               A PPT must exist before we can
               show presentation-only output.
            */

            if (!pptBuffer) {

                alert(
                    "Upload a PowerPoint presentation first."
                );

                /*
                   Return to normal mode.
                */

                displayMode =
                    "FULL_INTERFACE";


                presentationOnlyBtn.classList.remove(
                    "active"
                );


                if (fullInterfaceBtn) {

                    fullInterfaceBtn.classList.add(
                        "active"
                    );

                }

                return;

            }


            /*
               Open the projector only for this mode.
            */

            if (
    window.electronAPI &&
    typeof window.electronAPI.openProjector ===
        "function"
) {

    /*
       Electron desktop mode:
       let Electron place the presentation
       on the second display.
    */

    window.electronAPI
        .openProjector()
        .then(
            result => {

              if (
    result &&
    result.opened
) {

    updateProjectorStatus(
        "PROJECTOR ACTIVE"
    );


    /*
       Send the current slide immediately
       after the Electron projector opens.

       Electron also remembers this slide,
       so this remains safe if the projector
       finishes loading a little later.
    */

    setTimeout(
        () => {

            syncProjector();

        },
        300
    );

}

                else {

                    alert(
                        "No second display was detected. Connect the projector and try again."
                    );

                    displayMode =
                        "FULL_INTERFACE";

                    presentationOnlyBtn.classList.remove(
                        "active"
                    );


                    if (fullInterfaceBtn) {

                        fullInterfaceBtn.classList.add(
                            "active"
                        );

                    }

                    updateProjectorStatus(
                        "LAPTOP ONLY"
                    );

                }

            }
        )
        .catch(
            error => {

                console.error(
                    "Electron projector error:",
                    error
                );

                alert(
                    "Unable to open the projector display."
                );

            }
        );

}

else {

    /*
       Normal browser mode:
       keep the existing projector window.
    */

    openProjector();

    updateProjectorStatus(
        "PROJECTOR ACTIVE"
    );

}
        }
    );

}


if (fullInterfaceBtn) {

    fullInterfaceBtn.addEventListener(
        "click",
        () => {

            /*
               FULL INTERFACE means:
               normal laptop webpage behavior.

               Projector mode is disabled.
            */

            displayMode =
                "FULL_INTERFACE";


            fullInterfaceBtn.classList.add(
                "active"
            );


            if (presentationOnlyBtn) {

                presentationOnlyBtn.classList.remove(
                    "active"
                );

            }


            /*
               Stop projector synchronization
               and close the presentation-only
               window if it exists.
            */

            if (
                projectorWindow &&
                !projectorWindow.closed
            ) {

                projectorWindow.close();

            }
if (
    window.electronAPI &&
    typeof window.electronAPI.closeProjector ===
        "function"
) {

    window.electronAPI
        .closeProjector()
        .catch(
            error => {

                console.error(
                    "Electron projector close error:",
                    error
                );

            }
        );

}

            projectorWindow =
                null;
updateProjectorStatus(
    "LAPTOP ONLY"
);


            /*
               Reset projector slide handle.
            */

            if (typeof projectorSlideHandle !==
                "undefined" &&
                projectorSlideHandle) {

                try {

                    projectorSlideHandle.dispose();

                }

                catch (error) {}

                projectorSlideHandle =
                    null;

            }

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
/* =========================================================
   GESTURE RECOGNITION BRIDGE
   Recognition only — NO ACTION MAPPING YET
========================================================= */

const GESTURE_API_URL =
    "http://127.0.0.1:8000/gesture";


let gesturePollingActive = false;

let lastDisplayedGesture = "NONE";


/* =========================================================
   UI ELEMENTS
========================================================= */

const gestureStatus =
    document.getElementById(
        "gestureStatus"
    );


const recognitionStatus =
    document.getElementById(
        "recognitionStatus"
    );


const recognitionDot =
    document.getElementById(
        "recognitionDot"
    );
const gestureHands =
    document.getElementById(
        "gestureHands"
    );


const hand1Gesture =
    document.getElementById(
        "hand1Gesture"
    );


const hand2Gesture =
    document.getElementById(
        "hand2Gesture"
    );


const currentGesture =
    document.getElementById(
        "currentGesture"
    );


const gestureMovement =
    document.getElementById(
        "gestureMovement"
    );


const lastGestureAction =
    document.getElementById(
        "lastGestureAction"
    );


const recognitionModelText =
    document.getElementById(
        "recognitionModelText"
    );


/* =========================================================
   UPDATE GESTURE MODEL STATUS
========================================================= */

function updateGestureModelStatus(
    status
) {

    if (!gestureStatus) {
        return;
    }


    gestureStatus.textContent =
        status;

}


/* =========================================================
   UPDATE RECOGNITION STATUS
========================================================= */

function updateRecognitionStatus(
    status
) {

    if (recognitionStatus) {

        recognitionStatus.textContent =
            status;

    }


    if (recognitionDot) {

        recognitionDot.classList.remove(
            "active",
            "offline"
        );


        if (
            status ===
            "ACTIVE"
        ) {

            recognitionDot.classList.add(
                "active"
            );

        }

        else {

            recognitionDot.classList.add(
                "offline"
            );

        }

    }

}


/* =========================================================
   DISPLAY RECOGNIZED GESTURE
========================================================= */

function displayRecognizedGesture(
    gesture
) {

    if (!gesture) {
        return;
    }


    lastDisplayedGesture =
        gesture;


    if (currentGesture) {

        currentGesture.textContent =
            gesture;

    }


    console.log(
        "RECOGNIZED GESTURE:",
        gesture
    );
    if (gesture === "SWIPE_RIGHT") {

        goToSlide(
            currentSlide + 1
        );

        console.log(
            "TEST ACTION: NEXT SLIDE"
        );

    }


    if (gesture === "SWIPE_LEFT") {

        goToSlide(
            currentSlide - 1
        );

        console.log(
            "TEST ACTION: PREVIOUS SLIDE"
        );

    }


    /*
       IMPORTANT:

       No action is assigned yet.

       This only displays the
       recognized gesture.
    */

}

/* =========================================================
   POLL FASTAPI
========================================================= */

async function pollGestureRecognition() {

    if (
        gesturePollingActive
    ) {

        return;
    }


    gesturePollingActive =
        true;


    try {

        const response =
            await fetch(
                GESTURE_API_URL
            );


        if (
            !response.ok
        ) {

            updateGestureModelStatus(
                "OFFLINE"
            );

            updateRecognitionStatus(
                "OFFLINE"
            );

            return;

        }


        const data =
            await response.json();


        updateGestureModelStatus(
            "ACTIVE"
        );


        updateRecognitionStatus(
            "ACTIVE"
        );


        const gesture =
            data.gesture;


        if (
            gesture &&
            gesture !== "NONE"
        ) {

            displayRecognizedGesture(
                gesture
            );

        }

    }

    catch (
        error
    ) {

        /*
           FastAPI is not currently
           available.
        */

        updateGestureModelStatus(
            "STANDBY"
        );


        updateRecognitionStatus(
            "READY"
        );

    }

    finally {

        gesturePollingActive =
            false;

    }

}


/* =========================================================
   START RECOGNITION POLLING
========================================================= */

setInterval(
    pollGestureRecognition,
    150
);


/* =========================================================
   INITIAL STATUS
========================================================= */

updateGestureModelStatus(
    "STANDBY"
);


updateRecognitionStatus(
    "READY"
);

/* =========================================================
   PROCESS GESTURE
========================================================= */

function processGestureCommand(
    gesture
) {

    if (!gesture) {
        return;
    }


    if (
        gesture ===
        "SWIPE_RIGHT"
    ) {

        console.log(
            "GESTURE COMMAND: NEXT SLIDE"
        );


        goToSlide(
            currentSlide + 1
        );


        return;
    }


    if (
        gesture ===
        "SWIPE_LEFT"
    ) {

        console.log(
            "GESTURE COMMAND: PREVIOUS SLIDE"
        );


        goToSlide(
            currentSlide - 1
        );


        return;
    }

}


/* =========================================================
   POLL FASTAPI
========================================================= */

async function pollGestureAPI() {

    if (
        gesturePollingActive
    ) {

        return;
    }


    gesturePollingActive =
        true;


    try {

        const response =
            await fetch(
                GESTURE_API_URL
            );


        if (
            !response.ok
        ) {

            return;
        }


        const data =
            await response.json();


        const gesture =
            data.gesture;


        if (
            !gesture
        ) {

            return;
        }


        if (
            gesture ===
            "NONE"
        ) {

            return;
        }


        if (
            gesture !==
            lastGestureFromAPI
        ) {

            lastGestureFromAPI =
                gesture;


            processGestureCommand(
                gesture
            );


            /*

               Clear the API state after
               processing the command.

            */

            try {

                await fetch(
                    GESTURE_API_URL +
                    "/clear",
                    {
                        method:
                            "POST"
                    }
                );

            }

            catch (
                clearError
            ) {

                console.warn(
                    "Gesture clear failed:",
                    clearError
                );

            }


            lastGestureFromAPI =
                "NONE";

        }

    }

    catch (
        error
    ) {

        /*
           FastAPI may not be running.
           Do not flood the browser console.
        */

    }

    finally {

        gesturePollingActive =
            false;

    }

}


/* =========================================================
   START GESTURE POLLING
========================================================= */

setInterval(
    pollGestureAPI,
    150
);