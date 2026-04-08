// upload.js
import { supabase } from "./supabase.js";

// PREVENT default browser drag/drop behavior anywhere
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", (e) => e.preventDefault());

const uploadZone = document.querySelector(".upload-zone");

// CLICK to select file
uploadZone.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".pdf,.docx,.txt";
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) await uploadFile(file);
  };
  fileInput.click();
});

// DRAGOVER styling
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

// Remove dragover styling
uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

// DROP files
uploadZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (!file) return;

  // Call upload
  await uploadFile(file);
});

// UPLOAD file to Supabase
async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;

  try {
    const { data, error } = await supabase.storage
      .from("notes") // must match your bucket name
      .upload(fileName, file);

    if (error) throw error;

    alert(`Upload successful: ${file.name}`);
    console.log("Supabase data:", data);

    
  } catch (err) {
    alert(`Upload failed: ${err.message}`);
    console.error(err);
  }
}