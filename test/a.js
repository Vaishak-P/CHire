const loginBtn = document.getElementById("loginBtn");
const loginPopup = document.getElementById("loginPopup");
const closeButton = document.querySelector(".close-button");

loginBtn.addEventListener("click", () => {
  loginPopup.classList.remove("hidden");
});

closeButton.addEventListener("click", () => {
  loginPopup.classList.add("hidden");
});
