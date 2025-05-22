import { model } from "./mainmodule.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js";

const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const stopButton = document.createElement("button"); // Creating Stop button dynamically
stopButton.id = "stop-btn";
stopButton.innerHTML = '<img src="https://cdn-icons-png.flaticon.com/512/4029/4029077.png" alt="Stop" style="width: 20px; height: 20px; filter: invert(1);">';
stopButton.style.backgroundColor = "#7289da";
stopButton.style.color = "white";
stopButton.style.border = "none";
stopButton.style.padding = "10px";
stopButton.style.marginLeft = "10px";
stopButton.style.borderRadius = "4px";
stopButton.style.cursor = "pointer";
stopButton.style.display = "flex";
stopButton.style.alignItems = "center";
stopButton.style.justifyContent = "center";
stopButton.style.display = "none"; // Initially hidden
sendButton.parentNode.insertBefore(stopButton, sendButton.nextSibling); // Add after send button

const chatContainer = document.querySelector(".chat-container");

const userMessages = [];
const aiResponses = [];

let isGenerating = false;
let abortController;

// Updated typeText returns a promise so we can await its completion.
const typeText = (element, text, delay = 1) => {
    return new Promise((resolve) => {
        let index = 0;
        let temp = "";
        const interval = setInterval(() => {
            if (index < text.length) {
                temp += text.charAt(index);
                element.textContent = temp;
                index++;
            } else {
                clearInterval(interval);
                element.innerHTML = text;
                Prism.highlightAll();
                chatInput.disabled = false;
                sendButton.style.display = "inline-block"; // Show send button again
                stopButton.style.display = "none"; // Hide stop button
                isGenerating = false;
                resolve();
            }
        }, delay);
    });
};

const formatResponse = (text) => {
    return text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        lang = lang || "plaintext";
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });
};

// Render user's chat bubble.
function renderUserMessage(text) {
    const chatBubble = document.createElement("div");
    chatBubble.classList.add("chat-content-right");
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    chatBubble.innerHTML = 
        `<div class="chat-content chat-content-right">
            <img src="https://i.imgur.com/IrANMye.jpeg" alt="Profile Picture 2" class="profile-pic" style="margin-top: 40px; object-fit: cover;">
            <div class="chat-body-inner-right" style="font-size: 12px;">
                <p>${text}</p>
                <span class="timestamp" style="font-size: 10px; display: block; text-align: right;">${currentTime}</span>
            </div>
         </div>`;
    chatContainer.prepend(chatBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

const getChatResponse = async () => {
    chatInput.disabled = true;
    sendButton.style.display = "none"; // Hide send button
    stopButton.style.display = "inline-block"; // Show stop button

    const userText = chatInput.value;
    userMessages.push(userText);

    const conversationHistory = userMessages.map((msg, i) => `${msg}\n${aiResponses[i] || ''}`).join("\n");
    const fullContext = `${conversationHistory}\n${userText}`;

    const pEle = document.createElement("div");
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    abortController = new AbortController();
    isGenerating = true;

    try {
        const result = await model.generateContent(fullContext, { signal: abortController.signal });
        let response = await result.response.text();
        aiResponses.push(response);

        response = formatResponse(marked(response));

        pEle.classList.add("chat-content-left");
        pEle.innerHTML = 
            `<div class="chat-content chat-content-left">
                <img src="https://i.imgur.com/WkWKyqN.jpeg" alt="Profile Picture" class="profile-pic" style="margin-top: 40px;">
                <div class="chat-body-inner-left"> 
                    <p></p>
                    <span class="timestamp" style="font-size: 10px; display: block; text-align: right;">${currentTime}</span>
                </div>
            </div>`;

        chatContainer.prepend(pEle);
        const pElement = pEle.querySelector("p");

        typeText(pElement, response);

    } catch (error) {
        if (error.name === "AbortError") {
            pEle.innerHTML = 
                `<div class="chat-content chat-content-left">
                    <img src="https://i.imgur.com/WkWKyqN.jpeg" alt="Profile Picture" class="profile-pic" style="margin-top: 40px;">
                    <div class="chat-body-inner-left">
                        <p style="color: red;">Request Cancelled</p>
                        <span class="timestamp" style="font-size: 10px;">${currentTime}</span>
                    </div>
                </div>`;
        } else {
            console.error("Error fetching response:", error);
            pEle.innerHTML = 
                `<div class="chat-content chat-content-left">
                    <img src="https://i.imgur.com/WkWKyqN.jpeg" alt="Profile Picture" class="profile-pic" style="margin-top: 40px;">
                    <div class="chat-body-inner-left">
                        <p>Request aborted or an error occurred.</p>
                        <span class="timestamp" style="font-size: 10px;">${currentTime}</span>
                    </div>
                </div>`;
        }
        chatContainer.prepend(pEle);
        chatInput.disabled = false;
        sendButton.style.display = "inline-block"; // Show send button
        stopButton.style.display = "none"; // Hide stop button
        isGenerating = false;
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

const handleAPI = () => {
    const userText = chatInput.value.trim();
    if (!userText) return;

    // Check if the user is requesting a quiz/coding/practice question.
    if (/quiz|coding question|practice question/i.test(userText)) {
        renderUserMessage(userText);
        (async () => { await renderQuizQuestion(userText); })();
        chatInput.value = "";
        return;
    }

    // Normal chat response handling.
    renderUserMessage(userText);
    getChatResponse();
    chatInput.value = "";
};

// Stop button functionality to cancel AI response.
stopButton.addEventListener("click", () => {
    if (isGenerating) {
        abortController.abort();
        isGenerating = false;
        sendButton.style.display = "inline-block"; // Show send button again
        stopButton.style.display = "none"; // Hide stop button
    }
});

sendButton.addEventListener("click", handleAPI);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        handleAPI();
    }
});

const prismScript = document.createElement("script");
prismScript.src = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.28.0/prism.min.js";
document.head.appendChild(prismScript);

const prismCSS = document.createElement("link");
prismCSS.rel = "stylesheet";
prismCSS.href = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.28.0/themes/prism.min.css";
document.head.appendChild(prismCSS);

// Normalize answer strings for auto-correction (for non-coding questions).
function normalizeAnswer(answer) {
    return answer.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "");
}

// Generate a dynamic quiz based on the user's prompt. This always outputs a JSON array.
async function generateDynamicQuiz(userPrompt) {
    let count = 1;
    const countMatch = userPrompt.match(/(\d+)\s*(?:python\s+)?(?:coding|random|quiz|practice)?\s*questions?/i);
    if (countMatch) {
        count = parseInt(countMatch[1]);
    }
    const subject = /coding/i.test(userPrompt) ? "coding" : "general";
    const isPython = /python/i.test(userPrompt);
    const quizPrompt = `Generate an array of ${count} ${isPython ? "Python " : ""}${subject} quiz questions based on the following request: "${userPrompt}". 
Output a JSON array of objects with the following keys for each:
"question": a string containing the quiz question,
"type": either "multiple-choice" or "open-ended",
"options": an array of strings for answer choices (if multiple-choice, otherwise an empty array),
"answer": the correct answer as a string (or an array for checkbox type),
"subject": either "coding" or "general",
"formType": optionally specify a form type such as "dropdown", "checkbox", or "textarea" if desired.
Respond only with valid JSON.`;
    try {
         const result = await model.generateContent(quizPrompt);
         let responseText = await result.response.text();
         const startIndex = responseText.indexOf("[");
         if (startIndex === -1) {
             const startObj = responseText.indexOf("{");
             const endObj = responseText.lastIndexOf("}") + 1;
             const jsonString = responseText.substring(startObj, endObj);
             const quizData = JSON.parse(jsonString);
             return [quizData];
         } else {
             const endIndex = responseText.lastIndexOf("]") + 1;
             const jsonString = responseText.substring(startIndex, endIndex);
             const quizData = JSON.parse(jsonString);
             return quizData;
         }
    } catch (error) {
         console.error("Error generating dynamic quiz:", error);
         return [{
             question: "Default question: What is 2 + 2?",
             type: "open-ended",
             answer: "4",
             options: [],
             subject: "general",
             formType: "textfield"
         }];
    }
}

// Render interactive quiz questions in a single bubble with typing animation.
async function renderQuizQuestion(userText) {
    // Generate quiz data dynamically based on the user's prompt.
    const quizQuestions = await generateDynamicQuiz(userText);

    // Create one quiz bubble with a structure for animated content.
    const quizBubble = document.createElement("div");
    quizBubble.classList.add("chat-content-left");
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Updated quiz bubble structure includes a footer for total correct answers and the timestamp.
    const quizHTMLStructure = `<div class="chat-content chat-content-left">
         <img src="https://i.imgur.com/WkWKyqN.jpeg" alt="Profile Picture" class="profile-pic" style="margin-top: 40px;">
         <div class="chat-body-inner-left">
             <div id="quiz-animated-content"></div>
             <div class="quiz-footer" style="display: flex; justify-content: space-between; align-items: center; font-size: 10px;">
                <span class="total-correct" style="text-align: left;"></span>
                <span class="timestamp" style="text-align: right;">${currentTime}</span>
             </div>
         </div>
      </div>`;
    quizBubble.innerHTML = quizHTMLStructure;
    chatContainer.prepend(quizBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Build a single form for all questions using markdown formatting.
    let quizFormHTML = `<form class="global-quiz-form">`;
    quizQuestions.forEach((quizData, index) => {
        quizFormHTML += `<div class="quiz-question" data-index="${index}">
                            ${marked.parse(quizData.question)}
                            <br>`;
        // Render based on specified formType if provided.
        if (quizData.formType === "dropdown") {
            quizFormHTML += `<select name="quiz-answer-${index}">
                               <option value="" disabled selected>Select an option</option>`;
            quizData.options.forEach(option => {
                quizFormHTML += `<option value="${option}">${option}</option>`;
            });
            quizFormHTML += `</select>`;
        } else if (quizData.formType === "checkbox") {
            quizData.options.forEach(option => {
                quizFormHTML += `<label>
                                    <input type="checkbox" name="quiz-answer-${index}" value="${option}"> ${option}
                                 </label><br>`;
            });
        } else if (quizData.formType === "textarea") {
            quizFormHTML += `<textarea name="quiz-answer-${index}" placeholder="Your answer"></textarea>`;
        } else {
            // Default rendering based on question type.
            if (quizData.type === "multiple-choice") {
                quizData.options.forEach(option => {
                    quizFormHTML += `<label>
                                        <input type="radio" name="quiz-answer-${index}" value="${option}"> ${option}
                                     </label><br>`;
                });
            } else if (quizData.type === "open-ended") {
                quizFormHTML += `<input type="text" name="quiz-answer-${index}" placeholder="Your answer">`;
            }
        }
        quizFormHTML += `</div><hr>`;
    });
    quizFormHTML += `<button type="submit">Submit Answers</button>
                     </form>`;

    // Animate the quiz content into the container.
    const quizContentContainer = quizBubble.querySelector("#quiz-animated-content");
    await typeText(quizContentContainer, quizFormHTML, 1);

    // Attach event listener to process the answers.
    const quizForm = quizBubble.querySelector(".global-quiz-form");
    quizForm.addEventListener("submit", function(e) {
        e.preventDefault();
        let totalCorrect = 0;
        quizQuestions.forEach((quizData, index) => {
            let userAnswer = "";
            let isCorrect = false;
            if (quizData.formType === "dropdown") {
                const selectElem = quizForm.querySelector(`select[name="quiz-answer-${index}"]`);
                if (selectElem) {
                    userAnswer = selectElem.value;
                }
                if (quizData.type === "open-ended") {
                    const normalizedUser = normalizeAnswer(userAnswer);
                    const normalizedCorrect = normalizeAnswer(quizData.answer);
                    isCorrect = normalizedCorrect.includes(normalizedUser);
                } else {
                    isCorrect = userAnswer.trim() === quizData.answer;
                }
            } else if (quizData.formType === "checkbox") {
                const checkboxes = quizForm.querySelectorAll(`input[name="quiz-answer-${index}"]:checked`);
                const selectedOptions = Array.from(checkboxes).map(input => normalizeAnswer(input.value));
                if (Array.isArray(quizData.answer)) {
                    const correctOptions = quizData.answer.map(ans => normalizeAnswer(ans));
                    isCorrect = correctOptions.every(opt => selectedOptions.includes(opt));
                } else {
                    const normalizedUser = selectedOptions.join(" ");
                    const normalizedCorrect = normalizeAnswer(quizData.answer);
                    isCorrect = normalizedCorrect.includes(normalizedUser);
                }
            } else if (quizData.formType === "textarea") {
                const textArea = quizForm.querySelector(`textarea[name="quiz-answer-${index}"]`);
                if (textArea) {
                    userAnswer = textArea.value;
                }
                if (quizData.type === "open-ended") {
                    const normalizedUser = normalizeAnswer(userAnswer);
                    const normalizedCorrect = normalizeAnswer(quizData.answer);
                    isCorrect = normalizedCorrect.includes(normalizedUser);
                } else {
                    isCorrect = userAnswer.trim() === quizData.answer;
                }
            } else {
                // Default handling for multiple-choice and open-ended with text input.
                if (quizData.type === "multiple-choice") {
                    const selected = quizForm.querySelector(`input[name="quiz-answer-${index}"]:checked`);
                    if (selected) {
                        userAnswer = selected.value;
                    }
                    isCorrect = userAnswer.trim() === quizData.answer;
                } else if (quizData.type === "open-ended") {
                    const inputElem = quizForm.querySelector(`input[name="quiz-answer-${index}"]`);
                    if (inputElem) {
                        userAnswer = inputElem.value;
                    }
                    const normalizedUser = normalizeAnswer(userAnswer);
                    const normalizedCorrect = normalizeAnswer(quizData.answer);
                    isCorrect = normalizedCorrect.includes(normalizedUser);
                }
            }
            if (isCorrect) {
                totalCorrect++;
            }
            const markdownFeedback =
`**Question:** ${quizData.question}

**Your Answer:** ${userAnswer || "_No answer provided_"}

**Correct Answer:** ${quizData.answer}

**Result:** ${isCorrect ? "**Correct! Well done.**" : "**Incorrect.**"}`;
            const questionDiv = quizBubble.querySelector(`.quiz-question[data-index="${index}"]`);
            if (questionDiv) {
                questionDiv.innerHTML = marked.parse(markdownFeedback);
            }
        });
        // Update the total correct count in the footer.
        const totalCorrectElem = quizBubble.querySelector(".quiz-footer .total-correct");
        if (totalCorrectElem) {
            totalCorrectElem.textContent = `Total Correct: ${totalCorrect}`;
        }
        // Hide the global submit button after submission.
        const submitBtn = quizForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.style.display = "none";
        }
    });
}

const generateRandomQuestions = async () => {
    const prompt = "Generate 4 random generic concise questions in JSON format only. Response format: [\"Question 1\", \"Question 2\", \"Question 3\", \"Question 4\"]";

    try {
        const result = await model.generateContent(prompt);
        let responseText = await result.response.text();

        // Extract only the JSON part (handling potential markdown formatting)
        const jsonMatch = responseText.match(/\[.*\]/s);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.error("Error generating questions:", error);
    }

    // Fallback questions if AI fails
    return ["What is AI?", "Who invented the internet?", "Why is the sky blue?", "How do planes fly?"];
};

// Function to populate cards with questions
const populateCardsWithQuestions = async () => {
    const questions = await generateRandomQuestions();
    const cardElements = document.querySelectorAll(".card .question");

    cardElements.forEach((card, index) => {
        if (questions[index]) {
            card.textContent = questions[index];
        }
    });
};

// Run the function every time the page is refreshed
window.onload = populateCardsWithQuestions;

// Event listener for clicking a card to submit as user input
document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
        const questionText = card.querySelector(".question").textContent;
        chatInput.value = questionText; // Set chat input to question
        handleAPI(); // Trigger AI response
    });
});

const cards = document.querySelectorAll(".card");

cards.forEach(card => {
    card.addEventListener("click", () => {
        cards.forEach(c => c.style.display = "none"); // Hide all cards
    });
});
