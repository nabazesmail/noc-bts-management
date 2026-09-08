export const downloadExcel = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;

  const executeDownload = () => {
    // @ts-ignore
    const XLSX = window.XLSX;
    if (!XLSX) {
      console.error("XLSX library failed to load.");
      return;
    }

    // Convert JSON to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    
    // Trigger the file download
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  // Dynamically load the SheetJS (xlsx) library if it hasn't been loaded yet
  // @ts-ignore
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    document.body.appendChild(script);
    script.onload = executeDownload;
  } else {
    executeDownload();
  }
};

// Keeping this for backwards compatibility just in case
export const downloadCSV = downloadExcel;
