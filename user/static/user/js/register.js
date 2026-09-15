/* =========================================================
   Ember — Personnel Registry
   All markup lives in index.html. This file only:
     1. tracks form state
     2. moves between the 4 steps
     3. runs validation
     4. fills in the dynamic bits (OTP code, captcha, ID card)
   ========================================================= */

const state = {
    resendOtp: 0,
    email: "",
    emailVerified: false,
    otpSent: false,
    generatedOtp: null,
    captchaAnswer: null,
    phone: "",
    name: "",
    idType: "",
    idNumber: "",
    role: "",
    idNumberIssued: null // generated once, on reaching step 4
};

const roleTitles = {
    lawyer: "Lawyer",
    police_officer: "Police Officer/Field Officer",
    investigating_officer: "Investigating Officer",
    forensic_expert: "Forensic Expert/Lab Personnel",
    legal_officer: "Legal Officer",
    station_house_officer: "Station House Officer",
    court_official: "Judge/Court Official"
};

let currentStep = 1;

/* ---------------------------------------------------------
   STEP NAVIGATION
   --------------------------------------------------------- */
function goToStep(n) {
    currentStep = n;

    document.querySelectorAll(".step-view").forEach(section => {
        section.classList.toggle("active", Number(section.dataset.step) === n);
    });

    document.querySelectorAll(".rail .step").forEach(railStep => {
        const s = Number(railStep.dataset.railStep);
        railStep.classList.toggle("active", s === n);
        railStep.classList.toggle("done", s < n);
    });

    if (n === 4) fillSummaryCard();
}

/* ---------------------------------------------------------
   STEP 1 — Identity verification
   --------------------------------------------------------- */
function newCaptcha() {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 1;
    state.captchaAnswer = a + b;
    document.getElementById("captcha-a").textContent = a;
    document.getElementById("captcha-b").textContent = b;
    document.getElementById("captcha-input").value = "";
    document.getElementById("f-captcha").classList.remove("error");
}

function setOtpState(view) {
    // view is one of: "not-sent" | "pending" | "verified"
    document.getElementById("otp-not-sent").hidden = view !== "not-sent";
    document.getElementById("otp-pending").hidden = view !== "pending";
    document.getElementById("otp-verified").hidden = view !== "verified";
}

function sendOtp() {
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    document.getElementById("f-email").classList.toggle("error", !valid);
    emailInput.disabled = true;
    if (!valid) return;
    // sending email to backend
    try {
        fetch('/api/send-otp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({ email })
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    state.email = email;
                    state.otpSent = true;
                    document.getElementById("otp-target-email").textContent = state.email;
                    setOtpState("pending");
                }
                else {
                    emailInput.disabled = false;
                    document.getElementById("f-otp").classList.toggle("error", !data.success);
                    document.getElementById('otp-msg').innerText = `${data.msg}`
                }
            })
    } catch {
        alert("Error sending POST request to the backend")
    }
}

function verifyOtp() {
    const otp = document.getElementById("otp").value.trim();
    const email = document.getElementById("email").value.trim();
    // sending otp to backend
    fetch('/api/verify-otp/', {
        method: "POST",
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                state.emailVerified = true;
                setOtpState("verified");
            } else {
                document.getElementById("f-otp").classList.toggle("error", !data.success);
                document.getElementById('otp-msg').innerText = `${data.msg}`;
            }
        })
}

function resendOtp() {
    state.resendOtp += 1
    const email = document.getElementById("email").value.trim();
    // sending email address to backend
    fetch('/api/resend-otp/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify({ email })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById("otp-target-email").textContent = `${state.email}(${state.resendOtp})`;
            } else {
                document.getElementById("f-otp").classList.toggle("error", !data.success);
                document.getElementById('otp-msg').innerText = `${data.msg}`;
            }
        })
}

function changeEmail() {
    state.otpSent = false;
    state.emailVerified = false;
    state.generatedOtp = null;
    document.getElementById("email").disabled = false;
    setOtpState("not-sent");
}

function tryAdvanceStep1() {
    let ok = true;

    if (!state.emailVerified) {
        document.getElementById("f-email").classList.add("error");
        ok = false;
    }

    const captchaOk = parseInt(document.getElementById("captcha-input").value, 10) === state.captchaAnswer;
    document.getElementById("f-captcha").classList.toggle("error", !captchaOk);
    if (!captchaOk) ok = false;

    if (ok) goToStep(2);
}

/* ---------------------------------------------------------
   STEP 2 — Personal details
   --------------------------------------------------------- */
function toggleFieldError(id, isError) {
    document.getElementById(id).classList.toggle("error", isError);
}

function tryAdvanceStep2() {
    state.name = document.getElementById("name").value.trim();
    state.phone = document.getElementById("phone").value.trim();
    state.idType = document.getElementById("idtype").value;
    state.idNumber = document.getElementById("idnum").value.trim();

    const phoneValid = /^[+\d][\d\s-]{6,}$/.test(state.phone);

    let ok = true;
    toggleFieldError("f-name", !state.name); if (!state.name) ok = false;
    toggleFieldError("f-phone", !phoneValid); if (!phoneValid) ok = false;
    toggleFieldError("f-idtype", !state.idType); if (!state.idType) ok = false;
    toggleFieldError("f-idnum", !state.idNumber); if (!state.idNumber) ok = false;

    if (ok) goToStep(3);
}

/* ---------------------------------------------------------
   STEP 3 — Role assignment
   --------------------------------------------------------- */
function selectRole(card) {
    document.querySelectorAll(".role-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    state.role = card.dataset.role;
    document.getElementById("f-role").classList.remove("error");
}

function tryAdvanceStep3() {
    if (!state.role) {
        document.getElementById("f-role").classList.add("error");
        return;
    }
    goToStep(4);
}

/* ---------------------------------------------------------
   STEP 4 — Confirmation / ID card
   --------------------------------------------------------- */
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]
    ));
}

function generateIdNumber() {
    if (!state.idNumberIssued) {
        const year = new Date().getFullYear();
        const rand = Math.floor(100000 + Math.random() * 900000);
        state.idNumberIssued = `LDMS-${year}-${rand}`;
    }
    return state.idNumberIssued;
}

function renderQr(el, seed) {
    // deterministic pseudo-pattern derived from the seed string
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;

    el.innerHTML = "";
    for (let i = 0; i < 36; i++) {
        h = (h * 1103515245 + 12345) >>> 0;
        const cell = document.createElement("div");
        if ((h >> 16) % 2 === 0) cell.classList.add("on");
        el.appendChild(cell);
    }
}

function fillSummaryCard() {
    const initials = state.name
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map(w => w[0].toUpperCase()).join("") || "?";

    const maskedGovId = state.idNumber.length > 4
        ? "•••• " + state.idNumber.slice(-4)
        : state.idNumber;

    const issueDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const idNum = generateIdNumber();

    document.getElementById("id-initials").textContent = initials;
    document.getElementById("id-name").textContent = state.name;
    document.getElementById("id-role").textContent = roleTitles[state.role] || "—";
    document.getElementById("id-email").textContent = state.email;
    document.getElementById("id-phone").textContent = state.phone;
    document.getElementById("id-idtype-label").textContent = state.idType || "ID";
    document.getElementById("id-idnum").textContent = maskedGovId;
    document.getElementById("id-issued").textContent = issueDate;
    document.getElementById("id-number").textContent = `ID ${idNum}`;

    renderQr(document.getElementById("id-qr"), idNum);
}

function submitRegistration() {
    const btn = document.getElementById("step4-submit");
    btn.textContent = "Submitted ✓";
    btn.disabled = true;
}

/* ---------------------------------------------------------
   MISC
   --------------------------------------------------------- */
function setSessionTag() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const tag = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    document.getElementById("session-tag").textContent = tag;
}

/* ---------------------------------------------------------
   WIRE UP EVENTS
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    setSessionTag();
    newCaptcha();

    // Step 1
    document.getElementById("email").addEventListener("input", e => { state.email = e.target.value; });
    document.getElementById("send-otp").addEventListener("click", sendOtp);
    document.getElementById("verify-otp").addEventListener("click", verifyOtp);
    document.getElementById("resend-otp").addEventListener("click", resendOtp);
    document.getElementById("change-email").addEventListener("click", changeEmail);
    document.getElementById("captcha-refresh").addEventListener("click", newCaptcha);
    document.getElementById("step1-next").addEventListener("click", tryAdvanceStep1);

    // Step 2
    document.getElementById("step2-back").addEventListener("click", () => goToStep(1));
    document.getElementById("step2-next").addEventListener("click", tryAdvanceStep2);

    // Step 3
    document.querySelectorAll(".role-card").forEach(card => {
        card.addEventListener("click", () => selectRole(card));
    });
    document.getElementById("step3-back").addEventListener("click", () => goToStep(2));
    document.getElementById("step3-next").addEventListener("click", tryAdvanceStep3);

    // Step 4
    document.getElementById("step4-back").addEventListener("click", () => goToStep(3));
    document.getElementById("step4-submit").addEventListener("click", submitRegistration);
});
