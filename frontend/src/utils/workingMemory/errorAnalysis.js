export const analyzeSequenceError = (correctSeq, userInput) => {
  const correct = correctSeq.join("");
  
  if (userInput === correct) return "correct";

  // Partial match
  let correctCount = 0;
  for (let i = 0; i < userInput.length; i++) {
    if (userInput[i] === correct[i]) correctCount++;
  }

  if (correctCount > 0 && correctCount < correct.length) {
    return "partial_recall";
  }

  // Same numbers but wrong order
  const sortedCorrect = [...correct].sort().join("");
  const sortedUser = [...userInput].sort().join("");

  if (sortedCorrect === sortedUser) {
    return "wrong_order";
  }

  if (userInput.length < correct.length) {
    return "skipped";
  }

  return "incorrect";
};