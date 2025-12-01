"use strict";

window.addEventListener("load", function () {
    initTheme();
    loadSettingsFromLocalStorage();
    loadEventsFromLocalStorage();
    render();

    // Automatyczne ładowanie danych z URL przy starcie
    loadDataFromUrl();

    // Prevent drag and drop defaults
    document.querySelectorAll('[draggable="true"]').forEach((el) => {
        el.removeAttribute("draggable");
    });
    document.addEventListener("dragstart", (e) => { e.preventDefault(); return false; });
    document.addEventListener("drop", (e) => { e.preventDefault(); return false; });
    document.addEventListener("dragover", (e) => { e.preventDefault(); return false; });
});

// --- GLOBALNE ZMIENNE ---
const monthNames = [
    "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
    "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];
let currentDate = new Date();
let events = {};
let selectedDate = null;
let isDarkTheme = true;

// Konfiguracja GitHub do pobierania danych
const GITHUB_USER = 'skokivPr';
const GITHUB_REPO = 'json-lista';
const GITHUB_FILE = 'grafik.json';
const URL_MAIN = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/${GITHUB_FILE}`;
const URL_MASTER = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/master/${GITHUB_FILE}`;

// Domyślny URL (ustawiony na MAIN z repozytorium)
const DEFAULT_GRAFIK_URL = URL_MAIN;

// Ustawienia aplikacji
let appSettings = {
    firstDayOfWeek: "monday", // "monday" lub "sunday"
    workHours: 12, // domyślnie 12h
    highlightWeekends: true,
    grafikUrl: DEFAULT_GRAFIK_URL, // URL do pliku JSON
};

// Święta państwowe w Polsce (format: "YYYY-MM-DD")
const publicHolidays = {
    2025: [
        "2025-0-1",   // Nowy Rok
        "2025-0-6",   // Trzech Króli
        "2025-3-20",  // Wielkanoc
        "2025-3-21",  // Poniedziałek Wielkanocny
        "2025-4-1",   // Święto Pracy
        "2025-4-3",   // Święto Konstytucji 3 Maja
        "2025-5-8",   // Zielone Świątki
        "2025-5-19",  // Boże Ciało
        "2025-7-15",  // Wniebowzięcie NMP
        "2025-10-1",  // Wszystkich Świętych
        "2025-10-11", // Święto Niepodległości
        "2025-11-25", // Boże Narodzenie (1 dzień)
        "2025-11-26", // Boże Narodzenie (2 dzień)
    ],
    2026: [
        "2026-0-1",   // Nowy Rok
        "2026-0-6",   // Trzech Króli
        "2026-3-5",   // Wielkanoc
        "2026-3-6",   // Poniedziałek Wielkanocny
        "2026-4-1",   // Święto Pracy
        "2026-4-3",   // Święto Konstytucji 3 Maja
        "2026-4-24",  // Zielone Świątki
        "2026-5-4",   // Boże Ciało
        "2026-7-15",  // Wniebowzięcie NMP
        "2026-10-1",  // Wszystkich Świętych
        "2026-10-11", // Święto Niepodległości
        "2026-11-25", // Boże Narodzenie (1 dzień)
        "2026-11-26", // Boże Narodzenie (2 dzień)
    ],
    2024: [
        "2024-0-1",   // Nowy Rok
        "2024-0-6",   // Trzech Króli
        "2024-2-31",  // Wielkanoc
        "2024-3-1",   // Poniedziałek Wielkanocny
        "2024-4-1",   // Święto Pracy
        "2024-4-3",   // Święto Konstytucji 3 Maja
        "2024-4-19",  // Zielone Świątki
        "2024-4-30",  // Boże Ciało
        "2024-7-15",  // Wniebowzięcie NMP
        "2024-10-1",  // Wszystkich Świętych
        "2024-10-11", // Święto Niepodległości
        "2024-11-25", // Boże Narodzenie (1 dzień)
        "2024-11-26", // Boże Narodzenie (2 dzień)
    ],
};

// --- URL SANITIZER (Naprawa linków) ---
function sanitizeUrl(url) {
    try {
        if (!url) return '';
        const u = new URL(url);

        // 1. Konwersja GitHub Blob -> Raw
        if (u.hostname === 'github.com' && u.pathname.includes('/blob/')) {
            u.hostname = 'raw.githubusercontent.com';
            u.pathname = u.pathname.replace('/blob/', '/');
        }

        // 2. Obsługa Gist (Naprawa błędu CORS)
        if (u.hostname === 'gist.github.com') {
            u.hostname = 'gist.githubusercontent.com';
        }

        return u.toString();
    } catch (e) {
        return url;
    }
}

// --- FUNKCJE POMOCNICZE UI ---
function showNotification(message, isError = false) {
    const notification = document.getElementById("notification");
    if (notification) {
        notification.textContent = message;
        notification.classList.toggle("error", isError);
        notification.classList.add("show");
        setTimeout(() => {
            notification.classList.remove("show");
        }, 3000);
    }
}

// --- FUNKCJE MOTYWU ---
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    saveThemePreference();
}

function applyTheme() {
    const body = document.documentElement;
    body.setAttribute("data-theme", isDarkTheme ? "dark" : "light");
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeToggle = document.getElementById("theme-toggle");
    if (!themeToggle) return;
    const icon = themeToggle.querySelector("img");
    if (icon) {
        icon.src = isDarkTheme
            ? "https://api.iconify.design/lets-icons:sunlight-duotone.svg"
            : "https://api.iconify.design/lets-icons:moon-alt-duotone.svg";
        icon.alt = isDarkTheme ? "Tryb ciemny" : "Tryb jasny";
    }
}

function saveThemePreference() {
    localStorage.setItem("theme", isDarkTheme ? "dark" : "light");
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem("theme");
    isDarkTheme = savedTheme
        ? savedTheme === "dark"
        : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function initTheme() {
    loadThemePreference();
    applyTheme();
    try {
        window.matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", (e) => {
                if (!localStorage.getItem("theme")) {
                    isDarkTheme = e.matches;
                    applyTheme();
                }
            });
    } catch (e) {
        console.log("MatchMedia not supported");
    }
}

// --- FUNKCJE MODALI ---
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add("visible");
            });
        });
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("visible");
}

function openEventModal(dateStr) {
    selectedDate = dateStr;
    const [year, month, day] = dateStr.split("-").map(Number);
    const modalDateEl = document.getElementById("modal-date");
    if (modalDateEl) modalDateEl.textContent = `Data: ${day} ${monthNames[month]} ${year}`;

    const eventTextEl = document.getElementById("event-text");
    if (eventTextEl) {
        eventTextEl.value = "";
        setTimeout(() => {
            eventTextEl.focus();
        }, 100);
    }
    openModal("event-modal");
}

// --- FUNKCJE WYDARZEŃ ---
function selectQuickOption(option) {
    const el = document.getElementById("event-text");
    if (el) el.value = option;
    saveEvent();
}

function saveEvent() {
    const el = document.getElementById("event-text");
    if (!el) return;
    const eventText = el.value.trim();

    if (eventText && selectedDate) {
        if (!events[selectedDate]) events[selectedDate] = [];
        if (!events[selectedDate].includes(eventText)) {
            events[selectedDate].push(eventText);
        }
        saveEventsToLocalStorage();
        render();
        closeModal("event-modal");
    }
}

function confirmDeleteEvent(dateStr, eventText) {
    const message = document.getElementById("confirmation-message");
    const confirmBtn = document.getElementById("confirm-delete-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    if (message) message.textContent = `Czy na pewno chcesz usunąć wydarzenie "${eventText}"?`;

    const deleteHandler = () => {
        if (events[dateStr] && eventText) {
            const eventIndex = events[dateStr].indexOf(eventText);
            if (eventIndex > -1)
                events[dateStr].splice(eventIndex, 1);
            if (events[dateStr].length === 0)
                delete events[dateStr];
            saveEventsToLocalStorage();
            render();
        }
        closeModal("confirmation-modal");
        if (confirmBtn) confirmBtn.removeEventListener("click", deleteHandler);
    };

    if (confirmBtn) {
        confirmBtn.addEventListener("click", deleteHandler, { once: true });
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            closeModal("confirmation-modal");
            if (confirmBtn) confirmBtn.removeEventListener("click", deleteHandler);
        };
    }
    openModal("confirmation-modal");
}

// --- ZARZĄDZANIE DANYMI ---
function saveEventsToLocalStorage() {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
}

function loadEventsFromLocalStorage() {
    const savedEvents = localStorage.getItem("calendarEvents");
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    }
}

// --- FUNKCJE USTAWIEŃ ---
function loadSettingsFromLocalStorage() {
    const savedSettings = localStorage.getItem("calendarSettings");
    if (savedSettings) {
        appSettings = { ...appSettings, ...JSON.parse(savedSettings) };
    }
}

function saveSettingsToLocalStorage() {
    localStorage.setItem("calendarSettings", JSON.stringify(appSettings));
}

function openSettingsModal() {
    const themeSelect = document.getElementById("theme-select");
    if (themeSelect) themeSelect.value = isDarkTheme ? "dark" : "light";

    const firstDaySelect = document.getElementById("first-day-select");
    if (firstDaySelect) firstDaySelect.value = appSettings.firstDayOfWeek;

    const workHoursInput = document.getElementById("work-hours-input");
    if (workHoursInput) workHoursInput.value = appSettings.workHours;

    const highlightWeekends = document.getElementById("highlight-weekends");
    if (highlightWeekends) highlightWeekends.checked = appSettings.highlightWeekends;

    const grafikUrlInput = document.getElementById("grafik-url-input");
    if (grafikUrlInput) grafikUrlInput.value = appSettings.grafikUrl || DEFAULT_GRAFIK_URL;

    openModal("settings-modal");
}

function changeThemeFromSettings(theme) {
    isDarkTheme = theme === "dark";
    applyTheme();
    saveThemePreference();
}

function changeFirstDay(firstDay) {
    appSettings.firstDayOfWeek = firstDay;
    saveSettingsToLocalStorage();
    render();
    showNotification("Pierwszy dzień tygodnia został zmieniony");
}

function changeWorkHours(hours) {
    const hoursNum = parseInt(hours);
    if (hoursNum >= 1 && hoursNum <= 24) {
        appSettings.workHours = hoursNum;
        saveSettingsToLocalStorage();
        render();
        showNotification("Liczba godzin pracy została zmieniona");
    }
}

function changeGrafikUrl(url) {
    const trimmedUrl = sanitizeUrl(url.trim());
    if (trimmedUrl) {
        appSettings.grafikUrl = trimmedUrl;
        saveSettingsToLocalStorage();
        showNotification("Adres grafiku został zaktualizowany");
    }
}

function resetGrafikUrl() {
    appSettings.grafikUrl = DEFAULT_GRAFIK_URL;
    const input = document.getElementById("grafik-url-input");
    if (input) input.value = DEFAULT_GRAFIK_URL;
    saveSettingsToLocalStorage();
    showNotification("Przywrócono domyślny adres grafiku");
}

function toggleHighlightWeekends(highlight) {
    appSettings.highlightWeekends = highlight;
    saveSettingsToLocalStorage();
    document.documentElement.classList.toggle("hide-weekend-highlight", !highlight);
    showNotification(highlight ? "Weekendy są teraz wyróżnione" : "Wyróżnienie weekendów zostało wyłączone");
}

function clearAllData() {
    const message = document.getElementById("confirmation-message");
    const confirmBtn = document.getElementById("confirm-delete-btn");
    const cancelBtn = document.getElementById("confirm-cancel-btn");

    if (message) message.textContent = "Czy na pewno chcesz usunąć wszystkie dane kalendarza? Ta operacja jest nieodwracalna.";

    const clearHandler = () => {
        events = {};
        saveEventsToLocalStorage();
        render();
        closeModal("confirmation-modal");
        closeModal("settings-modal");
        showNotification("Wszystkie dane zostały usunięte");
        if (confirmBtn) confirmBtn.removeEventListener("click", clearHandler);
    };

    if (confirmBtn) {
        confirmBtn.addEventListener("click", clearHandler, { once: true });
    }
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            closeModal("confirmation-modal");
            if (confirmBtn) confirmBtn.removeEventListener("click", deleteHandler);
        };
    }
    openModal("confirmation-modal");
}

function exportData() {
    const dataStr = JSON.stringify(events, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kalendarz-dane-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const importedEvents = JSON.parse(e.target.result);
                if (typeof importedEvents === "object" && importedEvents !== null) {
                    events = importedEvents;
                    saveEventsToLocalStorage();
                    render();
                    showNotification("Dane zostały pomyślnie zaimportowane!");
                } else {
                    throw new Error("Nieprawidłowy format pliku.");
                }
            } catch (error) {
                showNotification("Błąd podczas importowania pliku.", true);
                console.error("Błąd importu:", error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- FUNKCJA ŁĄCZENIA DANYCH (MERGE) ---
function mergeCalendarData(incomingData) {
    let changed = false;
    for (const [date, list] of Object.entries(incomingData)) {
        if (!events[date]) {
            events[date] = [];
        }
        if (Array.isArray(list)) {
            list.forEach(item => {
                if (!events[date].includes(item)) {
                    events[date].push(item);
                    changed = true;
                }
            });
        }
    }
    return changed;
}

// --- DATA FETCHING (ZAAWANSOWANE Z FALLBACKIEM) ---
function loadDataFromUrl() {
    const calendarGrid = document.getElementById("calendar-grid");

    // Jeśli URL w ustawieniach jest inny niż domyślny, używamy go bezpośrednio (z sanitization)
    // Jeśli jest domyślny lub pusty, używamy logiki Main -> Master
    let useFallbackLogic = false;

    if (!appSettings.grafikUrl || appSettings.grafikUrl === DEFAULT_GRAFIK_URL || appSettings.grafikUrl.includes(GITHUB_REPO)) {
        useFallbackLogic = true;
    }

    if (!useFallbackLogic) {
        // Standardowe pobieranie dla customowego URL (np. Gist)
        fetchSimpleUrl(appSettings.grafikUrl);
        return;
    }

    // Zaawansowane pobieranie (Main -> Master)
    console.log(`Próba pobrania danych z: ${URL_MAIN}`);
    showNotification("Pobieranie grafiku online...");

    fetch(URL_MAIN)
        .then(res => {
            if (res.ok) return res.json();
            console.warn(`Błąd pobierania z main (${res.status}). Próba z gałęzi master: ${URL_MASTER}`);
            return fetch(URL_MASTER).then(resMaster => {
                if (!resMaster.ok) {
                    throw new Error(`Nie znaleziono pliku w gałęziach main ani master (Status: ${resMaster.status})`);
                }
                return resMaster.json();
            });
        })
        .then(data => {
            console.log("Dane załadowane pomyślnie:", data);
            if (typeof data === "object" && data !== null) {
                // ZMIANA: Zamiast events = data, używamy mergeCalendarData
                mergeCalendarData(data);
                saveEventsToLocalStorage();
                render();
                showNotification("Grafik online załadowany pomyślnie!");
            } else {
                throw new Error("Nieprawidłowy format danych z serwera");
            }
        })
        .catch(error => {
            console.error("Krytyczny błąd ładowania:", error);
            showNotification("Błąd pobierania danych", true);

            // Wyświetlenie błędu wewnątrz siatki kalendarza
            if (calendarGrid && Object.keys(events).length === 0) { // Pokaż błąd tylko jeśli nie ma żadnych wydarzeń
                calendarGrid.innerHTML = `
                    <div style="padding:4rem 2rem; text-align:center; color:var(--text-muted); grid-column:1/-1;">
                        <i data-lucide="alert-triangle" size="48" color="#ef4444" style="margin-bottom:1rem"></i><br>
                        <strong>SYSTEM ERROR: UNABLE TO FETCH DATA</strong><br>
                        <span style="font-size:0.8em; opacity:0.7">${error.message}</span><br><br>
                        <div style="font-size:0.7em; color:var(--text-muted); background:var(--bg-secondary); padding:1rem; display:inline-block; border:1px solid var(--border-color); border-radius: 8px;">
                            Sprawdź czy plik <strong>${GITHUB_FILE}</strong> istnieje w repozytorium <strong>${GITHUB_REPO}</strong><br>
                            Użytkownik: ${GITHUB_USER}
                        </div>
                    </div>
                `;
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        });
}

// Funkcja pomocnicza do prostego fetchowania (dla custom URL)
async function fetchSimpleUrl(url) {
    try {
        showNotification("Pobieranie grafiku z adresu niestandardowego...");
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
        const data = await response.json();
        if (typeof data === "object" && data !== null) {
            // ZMIANA: Używamy mergeCalendarData
            mergeCalendarData(data);
            saveEventsToLocalStorage();
            render();
            showNotification("Grafik online załadowany pomyślnie!");
        } else {
            throw new Error("Nieprawidłowy format danych");
        }
    } catch (error) {
        console.error("Błąd pobierania:", error);
        showNotification("Nie udało się pobrać grafiku.", true);
    }
}

// --- RENDEROWANIE KALENDARZA ---
function render() {
    updateWeekdaysHeader();
    renderCalendarGrid();
    calculateSummary();
}

function updateWeekdaysHeader() {
    const weekdaysGrid = document.querySelector(".weekdays-grid");
    if (!weekdaysGrid) return;

    if (appSettings.firstDayOfWeek === "monday") {
        weekdaysGrid.innerHTML = `
            <div>Pon</div><div>Wto</div><div>Śro</div><div>Czw</div><div>Pią</div><div>Sob</div><div>Nie</div>
        `;
    } else {
        weekdaysGrid.innerHTML = `
            <div>Nie</div><div>Pon</div><div>Wto</div><div>Śro</div><div>Czw</div><div>Pią</div><div>Sob</div>
        `;
    }
}

function renderCalendarGrid() {
    const calendarGrid = document.getElementById("calendar-grid");
    const monthYear = document.getElementById("month-year");

    if (!calendarGrid || !monthYear) return;

    calendarGrid.innerHTML = "";

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    monthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    let startDay = firstDayOfMonth.getDay();

    if (appSettings.firstDayOfWeek === "monday") {
        if (startDay === 0) startDay = 7;
        startDay--;
    }

    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();
    for (let i = startDay; i > 0; i--) {
        const day = prevMonthDays - i + 1;
        const date = new Date(year, month - 1, day);
        const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        calendarGrid.appendChild(createDayCell(day, dateStr, true));
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${month}-${i}`;
        calendarGrid.appendChild(createDayCell(i, dateStr, false));
    }

    const totalCells = startDay + daysInMonth;
    const remainingCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
    for (let i = 1; i <= remainingCells; i++) {
        const date = new Date(year, month + 1, i);
        const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        calendarGrid.appendChild(createDayCell(i, dateStr, true));
    }
}

function createDayCell(day, dateStr, isOtherMonth) {
    const dayCell = document.createElement("div");
    dayCell.className = `calendar-day ${isOtherMonth ? "other-month" : ""}`;
    dayCell.dataset.date = dateStr;

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;

    const eventsContainer = document.createElement("div");
    eventsContainer.className = "events-container";

    const today = new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d && !isOtherMonth;
    const isHoliday = !isOtherMonth && isPublicHoliday(y, m, d);

    if (isToday) {
        dayCell.classList.add("today");
        dayNumber.classList.add("today-indicator");
        eventsContainer.classList.add("today-events");
    }

    if (isHoliday) {
        dayCell.classList.add("public-holiday");
        dayNumber.classList.add("holiday-indicator");
    }

    dayCell.appendChild(dayNumber);
    dayCell.appendChild(eventsContainer);

    if (events[dateStr]) {
        events[dateStr].forEach((eventText) => {
            eventsContainer.appendChild(createEventElement(eventText, dateStr));
        });
    }

    if (!isOtherMonth) {
        dayCell.onclick = () => openEventModal(dateStr);
    }

    return dayCell;
}

function createEventElement(text, dateStr) {
    const eventEl = document.createElement("div");
    eventEl.className = "event";

    let eventClass = "event-blue";
    switch (text.toLowerCase()) {
        case "nocka": eventClass = "event-gray"; break;
        case "dniówka": eventClass = "event-yellow"; break;
        case "nadgodziny": eventClass = "event-purple"; break;
        case "urlop": eventClass = "event-green"; break;
    }
    eventEl.classList.add(eventClass);

    const eventTextSpan = document.createElement("span");
    eventTextSpan.className = "event-text";
    eventTextSpan.textContent = text;
    eventTextSpan.style.flex = "1";
    eventTextSpan.style.overflow = "hidden";
    eventTextSpan.style.textOverflow = "ellipsis";
    eventEl.appendChild(eventTextSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-event-btn";
    deleteBtn.innerHTML = "&times;";
    deleteBtn.title = "Usuń wydarzenie";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        confirmDeleteEvent(dateStr, text);
    };
    eventEl.appendChild(deleteBtn);

    return eventEl;
}

function isPublicHoliday(year, month, day) {
    const holidays = publicHolidays[year];
    if (!holidays) return false;
    const dateKey = `${year}-${month}-${day}`;
    return holidays.includes(dateKey);
}

function calculateWorkingDaysInMonth(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    let workingDays = 0;
    let holidays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            if (isPublicHoliday(year, month, day)) {
                holidays++;
            } else {
                workingDays++;
            }
        }
    }
    return { workingDays, holidays };
}

function calculateSummary() {
    const summaryContent = document.getElementById("summary-content");
    if (!summaryContent) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    let nocki = 0, dniowki = 0, nadgodziny = 0, urlopy = 0;

    for (const dateStr in events) {
        const [eventYear, eventMonth] = dateStr.split("-").map(Number);
        if (eventYear === year && eventMonth === month) {
            events[dateStr].forEach((eventText) => {
                switch (eventText.toLowerCase()) {
                    case "nocka": nocki++; break;
                    case "dniówka": dniowki++; break;
                    case "nadgodziny": nadgodziny++; break;
                    case "urlop": urlopy++; break;
                }
            });
        }
    }

    const przepracowanoDni = nocki + dniowki + nadgodziny;
    const przepracowanoGodzin = przepracowanoDni * appSettings.workHours;
    const monthData = calculateWorkingDaysInMonth(year, month);
    const normaGodzin = monthData.workingDays * 8;
    const normaDni12h = Math.ceil(normaGodzin / appSettings.workHours);
    const roznicaDni = przepracowanoDni - normaDni12h;
    const roznicaGodzin = przepracowanoGodzin - normaGodzin;
    const roznicaKolor = roznicaGodzin >= 0 ? "positive" : "negative";

    summaryContent.innerHTML = `
        <div class="summary-item"><p class="summary-number">${nocki}</p><p class="summary-label">Nocek</p></div>
        <div class="summary-item"><p class="summary-number">${dniowki}</p><p class="summary-label">Dniówek</p></div>
        <div class="summary-item"><p class="summary-number">${nadgodziny}</p><p class="summary-label">Nadgodzin</p></div>
        <div class="summary-item"><p class="summary-number">${urlopy}</p><p class="summary-label">Urlopów</p></div>
        <div class="summary-divider"></div>
        <div class="summary-item"><p class="summary-number">${przepracowanoDni}</p><p class="summary-label">Przepracowano</p></div>
        <div class="summary-item"><p class="summary-number summary-norm">${normaDni12h}</p><p class="summary-label">Norma (dni po ${appSettings.workHours}h)</p></div>
        <div class="summary-item"><p class="summary-number summary-${roznicaKolor}">${roznicaDni >= 0 ? '+' : ''}${roznicaDni}</p><p class="summary-label">Różnica dni</p></div>
        <div class="summary-divider"></div>
        <div class="summary-item"><p class="summary-number">${przepracowanoGodzin}h</p><p class="summary-label">Suma godzin</p></div>
        <div class="summary-item"><p class="summary-number summary-norm">${normaGodzin}h</p><p class="summary-label">Norma godzin</p></div>
        <div class="summary-item"><p class="summary-number summary-${roznicaKolor}">${roznicaGodzin >= 0 ? '+' : ''}${roznicaGodzin}h</p><p class="summary-label">Różnica godzin</p></div>
        ${monthData.holidays > 0 ? `<div class="summary-divider"></div><div class="summary-item"><p class="summary-number summary-holiday">${monthData.holidays}</p><p class="summary-label">Świąt</p></div>` : ''}
    `;
}

// --- NAWIGACJA ---
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    render();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    render();
}

// --- INICJALIZACJA ---
document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    loadSettingsFromLocalStorage();

    if (!appSettings.highlightWeekends) {
        document.documentElement.classList.add("hide-weekend-highlight");
    }

    document.querySelectorAll(".modal-overlay").forEach((modal) => {
        modal.onclick = function (e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        };
    });

    const eventTextInput = document.getElementById("event-text");
    if (eventTextInput) {
        eventTextInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") saveEvent();
        });
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeModal("event-modal");
            closeModal("confirmation-modal");
            closeModal("settings-modal");
        }
    });

    loadEventsFromLocalStorage();
    render();
});

// Expose functions to global scope
window.prevMonth = prevMonth;
window.nextMonth = nextMonth;
window.toggleTheme = toggleTheme;
window.openSettingsModal = openSettingsModal;
window.importData = importData;
window.loadDataFromUrl = loadDataFromUrl;
window.exportData = exportData;
window.selectQuickOption = selectQuickOption;
window.closeModal = closeModal;
window.saveEvent = saveEvent;
window.changeThemeFromSettings = changeThemeFromSettings;
window.changeFirstDay = changeFirstDay;
window.changeWorkHours = changeWorkHours;
window.toggleHighlightWeekends = toggleHighlightWeekends;
window.changeGrafikUrl = changeGrafikUrl;
window.resetGrafikUrl = resetGrafikUrl;
window.clearAllData = clearAllData;
