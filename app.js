const game = document.getElementById("game");

const TOTAL_QRS = 5;
const MAX_ATTEMPTS = 2;


// =====================================
// GET QR NUMBER
// =====================================

function getQRNumber() {

    const params =
        new URLSearchParams(window.location.search);

    const qr =
        Number(params.get("qr"));

    return Number.isInteger(qr)
        ? qr
        : null;
}


// =====================================
// SEEDED RANDOM + SHUFFLE
// =====================================

function mulberry32(seed) {

    return function () {

        seed |= 0;
        seed = (seed + 0x6D2B79F5) | 0;

        let t =
            Math.imul(seed ^ (seed >>> 15), 1 | seed);

        t =
            (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

    };

}


function shuffleArray(arr, rng) {

    const a = arr.slice();

    for (let i = a.length - 1; i > 0; i--) {

        const j =
            Math.floor(rng() * (i + 1));

        [a[i], a[j]] = [a[j], a[i]];

    }

    return a;

}


// =====================================
// SESSION (SHUFFLED QUESTIONS + CLUES)
// =====================================

function buildSession() {

    const seed =
        Math.floor(Math.random() * 2147483647);

    const rng = mulberry32(seed);


    // Shuffle the 5 questions among QR positions 1..5

    const questions =
        shuffleArray(HUNT_CONFIG.qrs, rng);

    const order = {};

    questions.forEach((q, i) => {
        order[i + 1] = q;
    });


    // Shuffle clue texts for QR 1..4; QR 5 keeps its original clue

    const cluePool =
        [1, 2, 3, 4].map(
            i => HUNT_CONFIG.qrs[i - 1].clue
        );

    const shuffledClues =
        shuffleArray(cluePool, rng);

    const clues = {};

    [1, 2, 3, 4].forEach((pos, idx) => {
        clues[pos] = shuffledClues[idx];
    });

    clues[5] = HUNT_CONFIG.qrs[4].clue;


    const session =
        { seed, order, clues };

    localStorage.setItem(
        "huntSession",
        JSON.stringify(session)
    );

    return session;

}


function getSession() {

    try {

        const raw =
            localStorage.getItem("huntSession");

        if (raw) return JSON.parse(raw);

    } catch {

        // ignore

    }

    return buildSession();

}


// =====================================
// COMPLETED QR STORAGE
// =====================================

function getCompletedQRs() {

    try {

        return JSON.parse(
            localStorage.getItem("completedQRs") || "[]"
        );

    } catch {

        return [];

    }

}


function saveCompletedQRs(list) {

    localStorage.setItem(
        "completedQRs",
        JSON.stringify(list)
    );

}


function isCompleted(qrNumber) {

    return getCompletedQRs()
        .includes(qrNumber);

}


function completeQR(qrNumber) {

    const completed =
        getCompletedQRs();

    if (!completed.includes(qrNumber)) {

        completed.push(qrNumber);

        saveCompletedQRs(completed);

    }

}


// =====================================
// ATTEMPT STORAGE
// =====================================

function getAttempts() {

    try {

        return JSON.parse(
            localStorage.getItem("qrAttempts") || "{}"
        );

    } catch {

        return {};

    }

}


function saveAttempts(attempts) {

    localStorage.setItem(
        "qrAttempts",
        JSON.stringify(attempts)
    );

}


function getAttemptsUsed(qrNumber) {

    return getAttempts()[qrNumber] || 0;

}


function addAttempt(qrNumber) {

    const attempts =
        getAttempts();

    attempts[qrNumber] =
        (attempts[qrNumber] || 0) + 1;

    saveAttempts(attempts);

    return attempts[qrNumber];

}


// =====================================
// DISQUALIFIED
// =====================================

function setDisqualified() {

    localStorage.setItem("disqualified", "1");

}


function isDisqualified() {

    return localStorage.getItem("disqualified") === "1";

}


// =====================================
// NEXT QR IN ORDER
// =====================================

function getNextQR() {

    for (let i = 1; i <= TOTAL_QRS; i++) {

        if (!isCompleted(i)) return i;

    }

    return null;

}


// =====================================
// RESET
// =====================================

function resetGame() {

    localStorage.removeItem("completedQRs");
    localStorage.removeItem("qrAttempts");
    localStorage.removeItem("lockedQuestions");
    localStorage.removeItem("disqualified");
    localStorage.removeItem("huntSession");

    showHome();

}


// =====================================
// HOME
// =====================================

function showHome() {

    game.innerHTML = `

        <div class="icon">
            🔎
        </div>

        <h1>
            ${HUNT_CONFIG.title}
        </h1>

        <p>
            Scan a QR code to start.
        </p>

        <p class="small">
            Questions are shuffled for every session.
        </p>

        <p class="small">
            You have only 2 attempts per question —
            2 wrong answers means you are disqualified.
        </p>

        <button
            class="reset-btn"
            onclick="resetGame()"
        >
            🔄 Reset Game
        </button>

    `;

}


// =====================================
// DISQUALIFIED
// =====================================

function showDisqualified() {

    game.innerHTML = `

        <div class="icon">
            🚫
        </div>

        <h1>
            Disqualified
        </h1>

        <p>
            You used both attempts and did not
            find the correct answer.
        </p>

        <p>
            You cannot continue the treasure hunt.
        </p>

        <button
            class="reset-btn"
            onclick="resetGame()"
        >
            🔄 Start Over
        </button>

    `;

}


// =====================================
// GO TO NEXT QR (out of order)
// =====================================

function showGoToNext(next) {

    game.innerHTML = `

        <div class="icon">
            🧭
        </div>

        <h1>
            Not this QR yet
        </h1>

        <p>
            You must complete the QRs in order.
        </p>

        <p class="next">
            Go and scan
            <strong>QR ${next}</strong>.
        </p>

        <button
            class="btn"
            onclick="history.back()"
        >
            Go Back
        </button>

    `;

}


// =====================================
// ALREADY COMPLETED
// =====================================

function showAlreadyCompleted(next) {

    game.innerHTML = `

        <div class="icon">
            ✅
        </div>

        <h1>
            Already completed
        </h1>

        <p>
            You already solved this QR.
        </p>

        ${
            next
            ?
            `
            <p class="next">
                Go and scan
                <strong>QR ${next}</strong>.
            </p>
            `
            :
            `
            <p class="next">
                🎉 Hunt complete!
                Go to the final treasure location.
            </p>
            `
        }

        <button
            class="btn"
            onclick="history.back()"
        >
            Go Back
        </button>

    `;

}


// =====================================
// QR NOT FOUND
// =====================================

function showNotFound() {

    game.innerHTML = `

        <div class="icon">
            ❌
        </div>

        <h1>
            QR Not Found
        </h1>

        <p>
            This QR code does not exist.
        </p>

    `;

}


// =====================================
// QUESTION
// =====================================

function showQuestion(qr, position) {

    const used =
        getAttemptsUsed(position);

    const remaining =
        MAX_ATTEMPTS - used;

    game.innerHTML = `

        <div class="badge">
            QR ${position}
        </div>

        <h1 class="question">
            ${qr.question}
        </h1>

        <div class="attempts">

            ❤️ Attempts remaining:
            <strong>
                ${remaining}
            </strong>

        </div>


        <div class="choices">

            ${qr.choices.map(
                (choice, index) => `

                <button
                    class="choice"
                    onclick="
                        checkAnswer(
                            ${position},
                            ${index}
                        )
                    "
                >

                    <span class="letter">

                        ${String.fromCharCode(
                            65 + index
                        )}

                    </span>

                    ${choice}

                </button>

            `
            ).join("")}

        </div>


        <div id="message"></div>

    `;

}


// =====================================
// CHECK ANSWER
// =====================================

function checkAnswer(position, selectedAnswer) {

    const session =
        getSession();

    const qr =
        session.order[position];


    if (!qr) return;


    if (isDisqualified()) {

        showDisqualified();

        return;

    }


    if (isCompleted(position)) {

        showAlreadyCompleted(getNextQR());

        return;

    }


    // Add one attempt

    const attemptsUsed =
        addAttempt(position);


    const message =
        document.getElementById("message");


    // =================================
    // CORRECT ANSWER
    // =================================

    if (
        selectedAnswer === qr.answer
    ) {

        completeQR(position);


        const next =
            getNextQR();

        const clue =
            session.clues[position];


        message.className =
            "success";


        message.innerHTML = `

            <div class="correct">
                ✅ Correct Answer!
            </div>

            <div class="clue">

                <h2>
                    💡 Clue
                </h2>

                <p>
                    ${clue}
                </p>

                ${
                    qr.clueImage
                    ?
                    `
                    <img
                        src="${qr.clueImage}"
                        alt="Clue"
                    >
                    `
                    :
                    ""
                }

            </div>


            ${
                next
                ?
                `
                <p class="next">

                    Now find and scan

                    <strong>
                        QR ${next}
                    </strong>.

                </p>
                `
                :
                `
                <h2>
                    🎉 Hunt Completed!
                </h2>
                `
            }

        `;


        disableChoices();

        return;

    }


    // =================================
    // WRONG ANSWER
    // =================================

    if (attemptsUsed >= MAX_ATTEMPTS) {

        // Set global disqualification

        setDisqualified();


        message.className =
            "wrong";


        message.innerHTML = `

            ❌ <strong>Wrong answer!</strong>

            <br><br>

            You have used both attempts.

            <br>

            🚫 You are now
            <strong>DISQUALIFIED</strong>.

        `;


        disableChoices();


        setTimeout(
            showDisqualified,
            2500
        );

        return;

    }


    // First wrong attempt

    const remaining =
        MAX_ATTEMPTS - attemptsUsed;


    message.className =
        "wrong";


    message.innerHTML = `

        ❌ <strong>Wrong answer!</strong>

        <br><br>

        You have
        <strong>
            ${remaining}
        </strong>
        attempt${remaining === 1 ? "" : "s"} remaining.

    `;

}


// =====================================
// DISABLE CHOICES
// =====================================

function disableChoices() {

    document
        .querySelectorAll(".choice")
        .forEach(button => {

            button.disabled = true;

        });

}


// =====================================
// START GAME
// =====================================

function startGame() {

    const qrNumber =
        getQRNumber();


    if (qrNumber === null) {

        showHome();

        return;

    }


    if (isDisqualified()) {

        showDisqualified();

        return;

    }


    if (
        qrNumber < 1 ||
        qrNumber > TOTAL_QRS
    ) {

        showNotFound();

        return;

    }


    const session =
        getSession();

    const qr =
        session.order[qrNumber];


    if (!qr) {

        showNotFound();

        return;

    }


    const next =
        getNextQR();


    // Already solved this QR

    if (isCompleted(qrNumber)) {

        showAlreadyCompleted(next);

        return;

    }


    // Scanned out of order

    if (next !== qrNumber) {

        showGoToNext(next);

        return;

    }


    showQuestion(qr, qrNumber);

}


startGame();
