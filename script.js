function openSettings() {
  document.getElementById("settingsModal").classList.add("show");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.remove("show");
}

function saveSettings() {
  const data = {
    title: document.getElementById("titleInput").value,
    subtitle: document.getElementById("subtitleInput").value,
    description: document.getElementById("descriptionInput").value,
    location: document.getElementById("locationInput").value,
    phone: document.getElementById("phoneInput").value,
    whatsapp: document.getElementById("whatsappInput").value,
    email: document.getElementById("emailInput").value
  };

  localStorage.setItem("teebLandingSettings", JSON.stringify(data));
  applySettings(data);
  closeSettings();
}

function applySettings(data) {
  document.getElementById("mainTitle").textContent = data.title;
  document.getElementById("subTitle").textContent = data.subtitle;
  document.getElementById("descriptionText").textContent = data.description;
  document.getElementById("locationText").textContent = data.location;
  document.getElementById("phoneText").textContent = data.phone;
  document.getElementById("whatsappText").textContent = data.whatsapp;
  document.getElementById("emailText").textContent = data.email;
}

function loadSettings() {
  const saved = localStorage.getItem("teebLandingSettings");
  if (!saved) return;

  const data = JSON.parse(saved);
  applySettings(data);

  document.getElementById("titleInput").value = data.title;
  document.getElementById("subtitleInput").value = data.subtitle;
  document.getElementById("descriptionInput").value = data.description;
  document.getElementById("locationInput").value = data.location;
  document.getElementById("phoneInput").value = data.phone;
  document.getElementById("whatsappInput").value = data.whatsapp;
  document.getElementById("emailInput").value = data.email;
}

function goLogin() {
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", loadSettings);
