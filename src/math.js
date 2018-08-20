import config from './config.js';

const resultsToDisplay = config.resultsToDisplay;

const mod = (n1, n2) => ((n1 % n2) + n2) % n2;

const getPageNumber = rowIdx => Math.floor(rowIdx / resultsToDisplay);

const getTotalPages = totalRows => Math.ceil(totalRows / resultsToDisplay);

const incrementRowIdx = (rowIdx, totalRows) => mod(rowIdx + 1, totalRows);
const decrementRowIdx = (rowIdx, totalRows) => mod(rowIdx - 1, totalRows);
const incrementPageNumber = (rowIdx, totalRows) => {
  const pageNumber = getPageNumber(rowIdx);
  const totalPages = getTotalPages(totalRows);
  return (mod(pageNumber + 1, totalPages)) * resultsToDisplay;
};
const decrementPageNumber = (rowIdx, totalRows) => {
  const pageNumber = getPageNumber(rowIdx);
  const totalPages = getTotalPages(totalRows);
  return (mod(pageNumber - 1, totalPages)) * resultsToDisplay;
};

const getMinDisplayedIdx = rowIdx => getPageNumber(rowIdx) * resultsToDisplay;

const getMaxDisplayedIdx = rowIdx => getPageNumber(rowIdx) * resultsToDisplay + resultsToDisplay;

const getRowsThisPage = (rowIdx, totalRows) => {
  return Math.min(
    totalRows - (getPageNumber(rowIdx) * resultsToDisplay),
    resultsToDisplay
  );
};

const getFauxcus = rowIdx => {
  return mod(rowIdx, resultsToDisplay);
}

export default {
  // mod,
  getPageNumber,
  getTotalPages,
  incrementRowIdx,
  decrementRowIdx,
  incrementPageNumber,
  decrementPageNumber,
  getRowsThisPage,
  getMinDisplayedIdx,
  getMaxDisplayedIdx,
  getFauxcus
};
