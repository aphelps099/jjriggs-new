// Photo trash — uploads that came off every page via /admin/photos/.
// Instead of hard-deleting, the editor moves the file to img/uploads/trash/
// and records it here so it can be restored with one click. A scheduled
// GitHub Action (trash-purge.yml) empties entries older than 30 days.
// Entry shape: {trash, orig, kind, name, deletedAt}
window.JJ_PHOTO_TRASH=[];
