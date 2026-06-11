const STORAGE_KEY = "trip-cost-calculator-state";

const form = document.querySelector("#tripForm");
const fields = {
  distance: document.querySelector("#distance"),
  consumption: document.querySelector("#consumption"),
  fuelPrice: document.querySelector("#fuelPrice"),
  tolls: document.querySelector("#tolls"),
  roundTrip: document.querySelector("#roundTrip"),
  themeSwitch: document.querySelector("#themeSwitch"),
};

const output = {
  effectiveDistance: document.querySelector("#effectiveDistance"),
  fuelNeeded: document.querySelector("#fuelNeeded"),
  fuelCost: document.querySelector("#fuelCost"),
  tollCost: document.querySelector("#tollCost"),
  totalCost: document.querySelector("#totalCost"),
  status: document.querySelector("#statusMessage"),
};

const moneyFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const literFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const kmFormatter = new Intl.NumberFormat("ru-RU", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

const numberFields = ["distance", "consumption", "fuelPrice", "tolls"];

function parseValue(input) {
  return Number(String(input.value).replace(",", "."));
}

function formatMoney(value) {
  return `${moneyFormatter.format(value)} ₽`;
}

function setFieldError(name, message) {
  const input = fields[name];
  const wrapper = input.closest(".field");
  const error = document.querySelector(`[data-error-for="${name}"]`);

  wrapper.classList.toggle("is-invalid", Boolean(message));
  input.setAttribute("aria-invalid", String(Boolean(message)));
  error.textContent = message;
}

function validateField(name) {
  const input = fields[name];
  const value = parseValue(input);
  const isOptionalTolls = name === "tolls" && input.value.trim() === "";

  if (isOptionalTolls) {
    setFieldError(name, "");
    return { valid: true, value: 0 };
  }

  if (input.value.trim() === "") {
    setFieldError(name, "Заполните поле.");
    return { valid: false, value: 0 };
  }

  if (!Number.isFinite(value) || value < 0) {
    setFieldError(name, "Введите число не меньше 0.");
    return { valid: false, value: 0 };
  }

  setFieldError(name, "");
  return { valid: true, value };
}

function getState() {
  return {
    distance: fields.distance.value,
    consumption: fields.consumption.value,
    fuelPrice: fields.fuelPrice.value,
    tolls: fields.tolls.value,
    roundTrip: fields.roundTrip.checked,
    theme: fields.themeSwitch.checked ? "dark" : "light",
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
}

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return;
  }

  try {
    const parsedState = JSON.parse(savedState);

    numberFields.forEach((name) => {
      if (typeof parsedState[name] === "string") {
        fields[name].value = parsedState[name];
      }
    });

    fields.roundTrip.checked = Boolean(parsedState.roundTrip);
    fields.themeSwitch.checked = parsedState.theme === "dark";
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = fields.themeSwitch.checked ? "dark" : "light";
}

function updateResults() {
  const hasAnyRequiredValue =
    fields.distance.value.trim() || fields.consumption.value.trim() || fields.fuelPrice.value.trim();

  // Keep the initial empty state calm: no red errors before the user starts.
  if (!hasAnyRequiredValue) {
    numberFields.forEach((name) => setFieldError(name, ""));
    output.status.textContent = "Введите данные, чтобы увидеть расчет.";
    output.status.classList.remove("is-error");
    renderEmptyResults();
    saveState();
    return;
  }

  const validation = {
    distance: validateField("distance"),
    consumption: validateField("consumption"),
    fuelPrice: validateField("fuelPrice"),
    tolls: validateField("tolls"),
  };

  const isValid = Object.values(validation).every((item) => item.valid);

  if (!isValid) {
    output.status.textContent = "Проверьте подсвеченные поля.";
    output.status.classList.add("is-error");
    renderEmptyResults();
    saveState();
    return;
  }

  // Round trip doubles only the effective distance; the original input remains editable.
  const multiplier = fields.roundTrip.checked ? 2 : 1;
  const effectiveDistance = validation.distance.value * multiplier;
  const fuelNeeded = (effectiveDistance * validation.consumption.value) / 100;
  const fuelCost = fuelNeeded * validation.fuelPrice.value;
  const totalCost = fuelCost + validation.tolls.value;

  output.effectiveDistance.textContent = `${kmFormatter.format(effectiveDistance)} км`;
  output.fuelNeeded.textContent = `${literFormatter.format(fuelNeeded)} л`;
  output.fuelCost.textContent = formatMoney(fuelCost);
  output.tollCost.textContent = formatMoney(validation.tolls.value);
  output.totalCost.textContent = formatMoney(totalCost);
  output.status.textContent = fields.roundTrip.checked
    ? "Расчет выполнен для поездки туда и обратно."
    : "Расчет выполнен для поездки в одну сторону.";
  output.status.classList.remove("is-error");

  saveState();
}

function renderEmptyResults() {
  output.effectiveDistance.textContent = "0 км";
  output.fuelNeeded.textContent = "0 л";
  output.fuelCost.textContent = formatMoney(0);
  output.tollCost.textContent = formatMoney(0);
  output.totalCost.textContent = formatMoney(0);
}

function resetCalculator() {
  form.reset();
  numberFields.forEach((name) => setFieldError(name, ""));
  output.status.textContent = "Введите данные, чтобы увидеть расчет.";
  output.status.classList.remove("is-error");
  renderEmptyResults();
  applyTheme();
  localStorage.removeItem(STORAGE_KEY);
}

numberFields.forEach((name) => {
  fields[name].addEventListener("input", updateResults);
});

fields.roundTrip.addEventListener("change", updateResults);

fields.themeSwitch.addEventListener("change", () => {
  applyTheme();
  saveState();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  updateResults();
});

document.querySelector("#resetButton").addEventListener("click", resetCalculator);

loadState();
applyTheme();
updateResults();
