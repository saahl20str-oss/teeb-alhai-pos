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
    phone: document.getElementById("phoneInput").value,
    whatsapp: document.getElementById("whatsappInput").value,
    email: document.getElementById("emailInput").value,
    location: document.getElementById("locationInput").value
  };

  localStorage.setItem("teebAlHaiSettings", JSON.stringify(data));
  applySettings(data);
  closeSettings();
}

function applySettings(data) {
  document.getElementById("mainTitle").textContent = data.title;
  document.getElementById("subTitle").textContent = data.subtitle;
  document.getElementById("descriptionText").textContent = data.description;
  document.getElementById("phoneText").textContent = data.phone;
  document.getElementById("whatsappText").textContent = data.whatsapp;
  document.getElementById("emailText").textContent = data.email;
  document.getElementById("locationText").textContent = data.location;
}

function loadSettings() {
  const saved = localStorage.getItem("teebAlHaiSettings");

  if (saved) {
    const data = JSON.parse(saved);
    applySettings(data);

    document.getElementById("titleInput").value = data.title;
    document.getElementById("subtitleInput").value = data.subtitle;
    document.getElementById("descriptionInput").value = data.description;
    document.getElementById("phoneInput").value = data.phone;
    document.getElementById("whatsappInput").value = data.whatsapp;
    document.getElementById("emailInput").value = data.email;
    document.getElementById("locationInput").value = data.location;
  }
}

function goLogin() {
  alert("الخطوة القادمة: بناء صفحة تسجيل الدخول وإنشاء حساب المدير.");
}

function scrollToContact() {
  document.getElementById("contact").scrollIntoView({
    behavior: "smooth"
  });
}

document.addEventListener("DOMContentLoaded", loadSettings);
