import React, { useState, useEffect } from "react";
import "./App.css";

/* ---------------------------------------
   GAME STATES
---------------------------------------- */
const GAME_STATE = {
  NOT_STARTED: 0,
  IN_PROGRESS: 1,
  FINISHED: 2,
};

/* ---------------------------------------
   HELPER FUNCTION: Convert Django List String → Array
---------------------------------------- */
const Convert = (s) => {
  if (!s) return [];
  s = s.replace(/'/g, ""); // remove quotes
  s = s.replace("[", "").replace("]", "");
  return s
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");
};

/* ---------------------------------------
   BOGGLE WORD VALIDATION (no dictionary)
---------------------------------------- */
function wordExistsOnBoard(word, board) {
  if (!board || board.length === 0) return false;
  word = word.toLowerCase();

  const rows = board.length;
  const cols = board[0].length;
  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  function dfs(r, c, i) {
    if (i === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    if (visited[r][c]) return false;
    if (board[r][c].toLowerCase() !== word[i]) return false;

    visited[r][c] = true;

    for (let [dr, dc] of dirs) {
      if (dfs(r + dr, c + dc, i + 1)) return true;
    }

    visited[r][c] = false;
    return false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (dfs(r, c, 0)) return true;
    }
  }

  return false;
}

/* ---------------------------------------
   MAIN APP
---------------------------------------- */
function App() {
  const [gameState, setGameState] = useState(GAME_STATE.NOT_STARTED);

  const [game, setGame] = useState({});
  const [grid, setGrid] = useState([]);
  const [allSolutions, setAllSolutions] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [missedWords, setMissedWords] = useState([]);

  const [input, setInput] = useState("");
  const [size] = useState(4); // using 4x4 board for assignment
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(60);

  /* ---------------------------------------
     FETCH GAME FROM DJANGO WHEN STARTING
  ---------------------------------------- */
  useEffect(() => {
    if (gameState !== GAME_STATE.IN_PROGRESS) return;

    const url =
      "https://chancecantina-egyptrent-8000.codio.io/api/game/create/" +
      size;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setGame(data);

        // convert Django string grid → 2D array
        const cleaned = data.grid.replace(/'/g, '"');
        setGrid(JSON.parse(cleaned));

        setFoundWords([]);
        setMissedWords([]);
        setMessage("");
      })
      .catch((err) => console.log(err));
  }, [gameState, size]);

  /* ---------------------------------------
     WHEN GRID or FOUNDWORDS CHANGE → UPDATE SOLUTIONS
  ---------------------------------------- */
  useEffect(() => {
    if (typeof game.foundwords !== "undefined") {
      const converted = Convert(game.foundwords);
      setAllSolutions(converted);
    }
  }, [grid, game.foundwords]);

  /* ---------------------------------------
     TIMER
  ---------------------------------------- */
  useEffect(() => {
    if (gameState !== GAME_STATE.IN_PROGRESS) return;

    if (timeLeft <= 0) {
      stopGame();
      return;
    }

    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [gameState, timeLeft]);

  /* ---------------------------------------
     START GAME
  ---------------------------------------- */
  const startGame = () => {
    setTimeLeft(60);
    setGameState(GAME_STATE.IN_PROGRESS);
  };

  /* ---------------------------------------
     STOP GAME
  ---------------------------------------- */
  const stopGame = () => {
    setGameState(GAME_STATE.FINISHED);

    const missed = allSolutions.filter(
      (w) => !foundWords.includes(w.toUpperCase())
    );
    setMissedWords(missed);
  };

  /* ---------------------------------------
     SUBMIT WORD
  ---------------------------------------- */
  const submitWord = () => {
    const word = input.trim().toUpperCase();
    setInput("");

    if (!word) return setMessage("Enter a word!");

    if (foundWords.includes(word)) {
      return setMessage("❌ Already found");
    }

    if (!wordExistsOnBoard(word, grid)) {
      return setMessage("❌ Word NOT on board");
    }

    setFoundWords([...foundWords, word]);
    setMessage("✔ Added!");
  };

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  return (
    <div className="wrapper">
      <div className="glass-card">
        <h1 className="title">Boggle (Django Connected)</h1>

        {/* START / STOP BUTTON */}
        {gameState !== GAME_STATE.IN_PROGRESS ? (
          <button className="btn start" onClick={startGame}>
            Start Game
          </button>
        ) : (
          <button className="btn stop" onClick={stopGame}>
            Stop Game
          </button>
        )}

        {/* TIMER */}
        {gameState === GAME_STATE.IN_PROGRESS && (
          <div className="timer-box">
            <div>Time Left:</div>
            <div className="timer-value">{timeLeft}s</div>
          </div>
        )}

        {/* BOARD */}
        {grid.length > 0 && (
          <div className="board">
            {grid.map((row, r) => (
              <div key={r} className="row">
                {row.map((letter, c) => (
                  <div key={c} className="tile">
                    {letter}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* WORD ENTRY */}
        {gameState === GAME_STATE.IN_PROGRESS && (
          <div className="input-row">
            <input
              className="word-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter word..."
            />
            <button className="btn submit" onClick={submitWord}>
              Submit
            </button>
          </div>
        )}

        {message && <p className="message">{message}</p>}

        {/* FOUND WORDS */}
        <h2 className="subheader">Words Found</h2>
        <ul className="word-list">
          {foundWords.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>

        {/* MISSED WORDS */}
        {gameState === GAME_STATE.FINISHED && missedWords.length > 0 && (
          <>
            <h2 className="subheader">Missed Words</h2>
            <ul className="word-list">
              {missedWords.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>

            <h2 className="subheader">All Valid Words</h2>
            <ul className="word-list">
              {allSolutions.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
