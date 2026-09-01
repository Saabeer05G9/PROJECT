import {
    PptxViewer,
    RECOMMENDED_ZIP_LIMITS
} from "@aiden0z/pptx-renderer";


/* =========================================================
   GLOBAL STATE
========================================================= */

let pptViewer = null;
let pptBuffer = null;
let currentSlide = 0;
let totalSlides = 0;

let thumbnailHandles = [];

let projectorWindow = null;


/* =========================================================
   ELEMENTS
========================================================= */

const upload =
    document.getElementById("pptUpload");

const pptContainer =
    document.getElementById("pptx-container");

const thumbnailContainer =
    document.getElementById("thumbnail-container");

const presentationStatus =
    document.getElementById("presentationStatus");

const presentationDot =
    document.getElementById("presentationDot");

const slideNumber =
    document.getElementById("slideNumber");

const slideCount =
    document.getElementById("slideCount");

const currentSlideText =
    document.getElementById("currentSlideText");

const previousSlide =
    document.getElementById("previousSlide");

const nextSlide =
    document.getElementById("nextSlide");

const presentationEmpty =
    document.getElementById("presentationEmpty");

const presentationFileName =
    document.getElementById("presentationFileName");


/* =========================================================
   HELPERS
========================================================= */

function setPresentationStatus(
    text,
    active = false
) {

    presentationStatus.textContent =
        text;

    presentationDot.classList.toggle(
        "active",
        active
    );

}


function updateSlideUI(index) {

    currentSlide =
        index;

    const displayNumber =
        index + 1;

    slideNumber.textContent =
        String(displayNumber)
            .padStart(2, "0");

    slideCount.textContent =
        `${displayNumber} OF ${totalSlides}`;

    currentSlideText.textContent =
        `${displayNumber} OF ${totalSlides}`;

    previousSlide.disabled =
        index <= 0;

    nextSlide.disabled =
        index >= totalSlides - 1;

    syncProjector();

}


/* =========================================================
   CLEAN OLD VIEWER
========================================================= */

function destroyViewer() {

    if (pptViewer) {

        try {

            pptViewer.destroy();

        } catch (error) {

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

            } catch (error) {}

        }
    );


    thumbnailHandles =
        [];

    pptContainer.innerHTML =
        "";

    thumbnailContainer.innerHTML =
        "";

}


/* =========================================================
   RENDER THUMBNAILS
========================================================= */

async function renderThumbnails() {

    thumbnailContainer.innerHTML =
        "";

    thumbnailHandles =
        [];


    /*
       Only create a reasonable number
       of thumbnails at first.

       For large presentations this prevents
       the interface from becoming heavy.
    */

    const visibleCount =
        Math.min(
            totalSlides,
            8
        );


    for (
        let index = 0;
        index < visibleCount;
        index++
    ) {

        const wrapper =
            document.createElement(
                "button"
            );

        wrapper.className =
            "ppt-thumbnail";


        wrapper.dataset.index =
            index;


        const preview =
            document.createElement(
                "div"
            );

        preview.className =
            "ppt-thumbnail-preview";


        wrapper.appendChild(
            preview
        );


        wrapper.addEventListener(
            "click",
            async () => {

                await goToSlide(
                    index
                );

            }
        );


        thumbnailContainer.appendChild(
            wrapper
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
                index,
                error
            );

        }

    }


    highlightThumbnail();

}


/* =========================================================
   HIGHLIGHT CURRENT THUMBNAIL
========================================================= */

function highlightThumbnail() {

    document
        .querySelectorAll(
            ".ppt-thumbnail"
        )
        .forEach(
            element => {

                const index =
                    Number(
                        element.dataset.index
                    );


                element.classList.toggle(
                    "active",
                    index === currentSlide
                );

            }
        );

}


/* =========================================================
   LOAD POWERPOINT
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


    if (
        extension !== "pptx"
    ) {

        alert(
            "For browser preview, please use a .pptx PowerPoint file."
        );

        return;

    }


    setPresentationStatus(
        "LOADING",
        false
    );


    presentationFileName.textContent =
        file.name;


    presentationEmpty.style.display =
        "none";


    destroyViewer();


    try {

        /*
           Keep a copy because the same presentation
           will also be sent to the projector window.
        */

        const sourceBuffer =
            await file.arrayBuffer();

        pptBuffer =
            sourceBuffer.slice(
                0
            );


        /*
           Render directly in the browser.
        */

        pptViewer =
            await PptxViewer.open(
                sourceBuffer,
                pptContainer,
                {
                    renderMode: "slide",

                    fitMode:
                        "contain",

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
                "No slides were found."
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
           Automatically prepare projector
           if it already exists.
        */

        syncProjector();


        console.log(
            `Loaded ${totalSlides} slides`
        );

    }

    catch (error) {

        console.error(
            "PowerPoint rendering failed:",
            error
        );


        destroyViewer();


        pptBuffer =
            null;

        totalSlides =
            0;

        currentSlide =
            0;


        presentationEmpty.style.display =
            "flex";


        setPresentationStatus(
            "ERROR",
            false
        );


        alert(
            "This PowerPoint could not be rendered in the browser.\n\n" +
            "Try saving it again as a standard .PPTX file from PowerPoint."
        );

    }

}


/* =========================================================
   SLIDE NAVIGATION
========================================================= */

async function goToSlide(
    index
) {

    if (
        !pptViewer ||
        totalSlides === 0
    ) {

        return;

    }


    index =
        Math.max(
            0,
            Math.min(
                index,
                totalSlides - 1
            )
        );


    try {

        await pptViewer.goToSlide(
            index
        );


        currentSlide =
            index;


        updateSlideUI(
            index
        );


        highlightThumbnail();

    }

    catch (error) {

        console.error(
            "Slide navigation error:",
            error
        );

    }

}


/* =========================================================
   NEXT / PREVIOUS
========================================================= */

previousSlide.addEventListener(
    "click",
    () => {

        goToSlide(
            currentSlide - 1
        );

    }
);


nextSlide.addEventListener(
    "click",
    () => {

        goToSlide(
            currentSlide + 1
        );

    }
);


/* =========================================================
   FILE UPLOAD
========================================================= */

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


/* =========================================================
   KEYBOARD NAVIGATION
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        /*
           Don't interfere with typing.
        */

        if (
            event.target.tagName ===
            "INPUT" ||
            event.target.tagName ===
            "TEXTAREA"
        ) {

            return;

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            goToSlide(
                currentSlide + 1
            );

        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            goToSlide(
                currentSlide - 1
            );

        }


        if (
            event.key ===
            "Home"
        ) {

            goToSlide(
                0
            );

        }


        if (
            event.key ===
            "End"
        ) {

            goToSlide(
                totalSlides - 1
            );

        }

    }
);


/* =========================================================
   PPT VIEWER EVENTS
========================================================= */

function attachViewerEvents() {

    if (!pptViewer)
        return;


    pptViewer.addEventListener(
        "slidechange",
        event => {

            const index =
                event.detail.index;


            currentSlide =
                index;


            updateSlideUI(
                index
            );


            highlightThumbnail();

        }
    );


    pptViewer.addEventListener(
        "slideerror",
        event => {

            console.warn(
                "Slide rendering error:",
                event.detail
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
            "The browser blocked the projector window. Allow pop-ups for this site and try again."
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

    overflow:hidden;

    background:#050607;

}

#projector-slide {

    width:100%;
    height:100%;

    display:flex;

    align-items:center;

    justify-content:center;

}

#projector-slide > * {

    max-width:100% !important;
    max-height:100% !important;

}

.status {

    position:fixed;

    left:50%;
    top:50%;

    transform:
        translate(-50%,-50%);

    color:#35e0a0;

    font-family:
        monospace;

    font-size:18px;

    letter-spacing:.1em;

}

</style>

</head>

<body>

<div id="projector">

    <div class="status">
        WAITING FOR PRESENTATION
    </div>

</div>


<script type="module">

import {
    PptxViewer,
    RECOMMENDED_ZIP_LIMITS
} from "/@id/__x00__@aiden0z/pptx-renderer";


let viewer = null;

let buffer = null;


window.addEventListener(
    "message",
    async event => {

        if (!event.data)
            return;


        if (
            event.data.type ===
            "LOAD_PPTX"
        ) {

            buffer =
                event.data.buffer;


            const container =
                document.getElementById(
                    "projector"
                );


            container.innerHTML =
                "";


            try {

                viewer =
                    await PptxViewer.open(
                        buffer,
                        container,
                        {
                            renderMode:
                                "slide",

                            fitMode:
                                "contain",

                            zipLimits:
                                RECOMMENDED_ZIP_LIMITS
                        }
                    );


                await viewer.goToSlide(
                    event.data.slide || 0
                );

            }

            catch(error) {

    console.error(
        error
    );

    container.innerHTML =
        '<div class="status">PRESENTATION ERROR</div>';

}

        }


        if (
            event.data.type ===
            "GO_TO_SLIDE"
        ) {

            if (
                viewer &&
                viewer.slideCount
            ) {

                await viewer.goToSlide(
                    event.data.slide
                );

            }

        }

    }
);

<\/script>

</body>

</html>
    `);


    projectorWindow.document.close();


    /*
       Wait for popup to initialize.
    */

    setTimeout(
        () => {

            syncProjector();

        },
        500
    );

}


/* =========================================================
   PROJECTOR SYNC
========================================================= */

function syncProjector() {

    if (
        !projectorWindow ||
        projectorWindow.closed ||
        !pptBuffer
    ) {

        return;

    }


    /*
       If the projector viewer already exists,
       only send the slide number.
    */

    try {

        projectorWindow.postMessage(
            {
                type:
                    "GO_TO_SLIDE",

                slide:
                    currentSlide
            },
            "*"
        );

    }

    catch(error) {}

}


/* =========================================================
   PRESENTATION ONLY BUTTON
========================================================= */

const presentationOnlyBtn =
    document.getElementById(
        "presentationOnlyBtn"
    );


presentationOnlyBtn.addEventListener(
    "click",
    () => {

        if (!pptBuffer) {

            alert(
                "Upload a PowerPoint presentation first."
            );

            return;

        }


        openProjector();

    }
);


/* =========================================================
   FULL INTERFACE BUTTON
========================================================= */

const fullInterfaceBtn =
    document.getElementById(
        "fullInterfaceBtn"
    );


fullInterfaceBtn.addEventListener(
    "click",
    () => {

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


/* =========================================================
   ATTACH EVENTS AFTER VIEWER LOAD
========================================================= */

const originalLoad =
    loadPowerPoint;


/*
   Re-attach viewer events after each load.
*/

upload.addEventListener(
    "change",
    async () => {

        setTimeout(
            () => {

                attachViewerEvents();

            },
            100
        );

    }
);


/* =========================================================
   INITIAL STATE
========================================================= */

setPresentationStatus(
    "NO FILE",
    false
);

previousSlide.disabled =
    true;

nextSlide.disabled =
    true;