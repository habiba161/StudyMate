const uploadZone = document.querySelector(".upload-zone");
const notesTextarea = document.querySelector(".textarea");

document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
});

uploadZone.addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".txt,.pdf,.pptx";

  fileInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  fileInput.click();
});

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

async function handleFile(file) {
  try {
    if (file.type === "text/plain") {
      extractTextFromFile(file);
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      extractTextFromPDF(file);
    } else if (file.name.toLowerCase().endsWith(".pptx")) {
      extractTextFromPPTX(file);
    } else {
      alert("Unsupported file type.");
    }
  } catch (err) {
    console.error(err);
    alert("File handling failed: " + err.message);
  }
}

function extractTextFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    notesTextarea.value = event.target.result;
  };
  reader.readAsText(file);
}

function extractTextFromPDF(file) {
  const fileReader = new FileReader();

  fileReader.onload = async (e) => {
    const typedArray = new Uint8Array(e.target.result);
    const pdfDoc = await pdfjsLib.getDocument(typedArray).promise;

    let textContent = "";

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const pageText = await page.getTextContent();
      textContent += pageText.items.map((item) => item.str).join(" ") + "\n";
    }

    notesTextarea.value = textContent;
  };

  fileReader.readAsArrayBuffer(file);
}

function extractTextFromPPTX(file) {
  const reader = new FileReader();

  reader.onload = async (e) => {
    const arrayBuffer = e.target.result;
    const zip = await JSZip.loadAsync(arrayBuffer);

    let textContent = "";
    const slideFiles = Object.keys(zip.files).filter((name) =>
      name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    for (const slideName of slideFiles) {
      const data = await zip.file(slideName).async("text");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, "application/xml");
      const textNodes = xmlDoc.getElementsByTagName("a:t");

      for (let i = 0; i < textNodes.length; i++) {
        textContent += textNodes[i].textContent + "\n";
      }
    }

    notesTextarea.value = textContent;
  };

  reader.readAsArrayBuffer(file);
}