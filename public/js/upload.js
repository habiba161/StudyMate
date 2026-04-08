import { supabase } from "./supabase.js";

// Prevent default for dragover and drop (to avoid opening in new tab)
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
});

const uploadZone = document.querySelector(".upload-zone");
const notesTextarea = document.querySelector(".textarea");

// Click to upload
uploadZone.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".pdf,.pptx,.txt,.docx";  // Added PowerPoint support
  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) await handleFile(file);
  };
  fileInput.click();
});

// Drag & drop effects
uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadZone.classList.add("dragover");
});

uploadZone.addEventListener("dragleave", () => {
  uploadZone.classList.remove("dragover");
});

uploadZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  uploadZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];
  if (!file) return;

  await handleFile(file);
});

// Handle file upload + populate textarea
async function handleFile(file) {
  const fileName = `${Date.now()}_${file.name}`;

  // Upload the file to Supabase
  try {
    const { data, error } = await supabase.storage
      .from("notes")
      .upload(fileName, file);

    if (error) throw error;

    console.log("Supabase upload successful:", data);
    alert(`Upload successful: ${file.name}`);
  } catch (err) {
    console.error(err);
    alert(`Upload failed: ${err.message}`);
  }

  // Handle text extraction based on file type
  if (file.type === "text/plain") {
    extractTextFromFile(file);
  } else if (file.name.endsWith(".pdf")) {
    extractTextFromPDF(file);
  } else if (file.name.endsWith(".pptx")) {
    extractTextFromPPTX(file);
  } else {
    alert("Unsupported file type.");
  }
}

// Extract text from .txt files
function extractTextFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    notesTextarea.value = text; // Populate textarea for summarizer
  };
  reader.readAsText(file);
}

// Extract text from PDF files
function extractTextFromPDF(file) {
  const fileReader = new FileReader();

  fileReader.onload = async (e) => {
    const typedArray = new Uint8Array(e.target.result);
    const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;

    let textContent = "";

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const pageText = await page.getTextContent();
      const pageTextItems = pageText.items;
      textContent += pageTextItems.map((item) => item.str).join(" ");
    }

    notesTextarea.value = textContent; // Populate textarea for summarizer
  };

  fileReader.readAsArrayBuffer(file);
}

// Extract text from PowerPoint (.pptx)
function extractTextFromPPTX(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const arrayBuffer = e.target.result;
    const zip = new JSZip();

    zip.loadAsync(arrayBuffer).then((zip) => {
      let textContent = "";

      zip.file("ppt/slides/slide1.xml").async("text").then((data) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data, "application/xml");
        const textNodes = xmlDoc.getElementsByTagName("a:t");

        // Loop through each text node and get the content
        for (let i = 0; i < textNodes.length; i++) {
          textContent += textNodes[i].textContent + "\n";
        }

        notesTextarea.value = textContent; // Populate textarea for summarizer
      });
    });
  };

  reader.readAsArrayBuffer(file);
}