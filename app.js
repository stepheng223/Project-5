import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE = "https://chancecantina-egyptrent-8000.codio.io/api";

/* -----------------------------
   Generate random 4x4 board
------------------------------ */
function generateBoard() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const newBoard = [];
  for (let i = 0; i < 4; i++) {
    const row = [];
    for (let j = 0; j < 4; j++) {
      row.push(letters[Math.floor(Math.random() * letters.length)]);
    }
    newBoard.push(row);
  }
  return newBoard;
}

/* -----------------------------
   Check if word exists on board
------------------------------ */
function wordExistsOnBoard(word, board) {
  word = word.toLowerCase();
  const rows = board.length;
  const cols = board[0].length;

  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1],
  ];

  function dfs(r, c, index) {
    if (index === word.length) return true;
    if (r < 0 || c < 0 || r >= rows || c >= cols) return false;
    if (visited[r][c]) return false;
    if (board[r][c].toLowerCase() !== word[index]) return false;

    visited[r][c] = true;

    for (const [dr, dc] of dirs) {
      if (dfs(r + dr, c + dc, index + 1)) return true;
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

/* -----------------------------
   Boggle Solver for full solution list
------------------------------ */
function findAllBoardWords(board, dictionary) {
  if (!board || board.length === 0) return [];

  const rows = board.length;
  const cols = board[0].length;

  const dictSet = new Set(dictionary);
  const prefixSet = new Set();

  for (const w of dictionary) {
    for (let i = 1; i <= w.length; i++) prefixSet.add(w.slice(0, i));
  }

  const results = new Set();
  const visited = Array.from({ length: rows }, () =>
    Array(cols).fill(false)
  );

  const dirs = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1],  [1, 0], [1, 1],
  ];

  function dfs(r, c, curr) {
    if (r < 0 || c < 0 || r >= rows || c >= cols || visited[r][c]) return;
    curr += board[r][c].toLowerCase();

    if (!prefixSet.has(curr)) return;

    visited[r][c] = true;

    if (curr.length >= 3 && dictSet.has(curr)) {
      results.add(curr.toUpperCase());
    }

    for (const [dr, dc] of dirs) dfs(r + dr, c + dc, curr);

    visited[r][c] = false;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) dfs(r, c, "");
  }
  return Array.from(results);
}

/* -----------------------------
   MAIN APP COMPONENT
------------------------------ */
function App() {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [board, setBoard] = useState([]);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");

  const [dictionary, setDictionary] = useState([]);
  const [dictReady, setDictReady] = useState(false);

  const [allSolutions, setAllSolutions] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [missedWords, setMissedWords] = useState([]);

  const [savedGames, setSavedGames] = useState([]);
  const [gameName, setGameName] = useState("");

  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("");

  /* ------------------------------------------
      LOAD DICTIONARY
  ------------------------------------------ */
  useEffect(() => {
    fetch("full-wordlist.json")
      .then((res) => res.json())
      .then((data) => {
        setDictionary(data.map((w) => w.toLowerCase()));
        setDictReady(true);
      });
  }, []);

  /* ------------------------------------------
      START NEW GAME
  ------------------------------------------ */
  const startGame = () => {
    if (!dictReady) return;
    const newBoard = generateBoard();
    const solutions = findAllBoardWords(newBoard, dictionary);

    setBoard(newBoard);
    setAllSolutions(solutions);
    setFoundWords([]);
    setMissedWords([]);
    setMessage("");
    setInput("");
    setStarted(true);
    setTimeLeft(60);
  };

  /* ------------------------------------------
      STOP GAME → Show missed words
  ------------------------------------------ */
  const stopGame = () => {
    setStarted(false);
    const missed = allSolutions.filter((w) => !foundWords.includes(w));
    setMissedWords(missed);
    setMessage("Game Over!");
  };

  /* ------------------------------------------
      TIMER
  ------------------------------------------ */
  useEffect(() => {
    if (!started) return;
    if (timeLeft <= 0) {
      stopGame();
      return;
    }
    const t = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(t);
  }, [started, timeLeft]);

  /* ------------------------------------------
      SUBMIT WORD
  ------------------------------------------ */
  const submitWord = () => {
    const word = input.trim().toUpperCase();
    setInput("");

    if (!started) return setMessage("Game not running.");
    if (!word) return setMessage("Enter a word.");
    if (foundWords.includes(word)) return setMessage("Already found.");
    if (!wordExistsOnBoard(word, board))
      return setMessage("Not on this board.");

    setFoundWords([...foundWords, word]);
    setMessage("Word added!");
  };

  /* ------------------------------------------
      SAVE GAME TO DJANGO
  ------------------------------------------ */
  async function saveGame() {
    if (!gameName) return alert("Enter a name for the game.");

    const res = await fetch(`${API_BASE}/games/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gameName,
        grid: board,
        solution_words: allSolutions,
      }),
    });

    alert("Game saved!");
    loadSavedGames();
  }

  /* ------------------------------------------
      LOAD SAVED GAMES
  ------------------------------------------ */
  async function loadSavedGames() {
    const res = await fetch(`${API_BASE}/games/`);
    const data = await res.json();
    setSavedGames(data);
  }

  /* ------------------------------------------
      START A SAVED GAME
  ------------------------------------------ */
  function startSavedGame(game) {
    setBoard(game.grid);
    setAllSolutions(game.solution_words);
    setFoundWords([]);
    setMissedWords([]);
    setMessage("");
    setStarted(true);
    setTimeLeft(60);
  }

  /* ------------------------------------------
      SUBMIT SCORE TO LEADERBOARD
  ------------------------------------------ */
  async function submitScore() {
    if (!playerName) return alert("Enter your name.");
    if (!gameName) return alert("Save the game first!");

    const game = savedGames.find((g) => g.name === gameName);
    if (!game) return alert("Game not found in saved list.");

    const scoreValue = foundWords.length * 10;

    await fetch(`${API_BASE}/leaderboard/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: playerName,
        score: scoreValue,
        game: game.id,
      }),
    });

    alert("Score submitted!");
    loadLeaderboard();
  }

  /* ------------------------------------------
      LOAD LEADERBOARD
  ------------------------------------------ */
  async function loadLeaderboard() {
    const res = await fetch(`${API_BASE}/leaderboard/`);
    const data = await res.json();
    setLeaderboard(data);
  }

  /* ------------------------------------------
      UI STARTS HERE
  ------------------------------------------ */
  return (
    <div className="wrapper">
      <h1>Boggle Game</h1>

      {/* START / STOP */}
      {!started ? (
        <button onClick={startGame}>Start Game</button>
      ) : (
        <button onClick={stopGame}>Stop</button>
      )}

      {/* TIMER */}
      {started && <h2>Time Left: {timeLeft}s</h2>}

      {/* BOARD */}
      {started && (
        <div className="board">
          {board.map((row, r) => (
            <div className="row" key={r}>
              {row.map((l, c) => (
                <div className="tile" key={c}>{l}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* WORD INPUT */}
      {started && (
        <div>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter word"
          />
          <button onClick={submitWord}>Submit</button>
        </div>
      )}

      <p>{message}</p>

      {/* SAVE GAME UI */}
      <div>
        <h3>Save Game</h3>
        <input
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          placeholder="Game name..."
        />
        <button onClick={saveGame}>Save Game</button>
      </div>

      <hr />

      {/* LOAD SAVED GAMES */}
      <h3>Saved Games</h3>
      <button onClick={loadSavedGames}>Refresh Saved Games</button>
      <ul>
        {savedGames.map((g) => (
          <li key={g.id}>
            {g.name}
            <button onClick={() => startSavedGame(g)}>Start</button>
          </li>
        ))}
      </ul>

      <hr />

      {/* LEADERBOARD */}
      <h3>Leaderboard</h3>
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Your name"
      />
      <button onClick={submitScore}>Submit Score</button>

      <button onClick={loadLeaderboard}>View Leaderboard</button>

      <ul>
        {leaderboard.map((entry) => (
          <li key={entry.id}>
            {entry.player_name} — {entry.score} pts (Game {entry.game})
          </li>
        ))}
      </ul>

      {/* RESULTS */}
      <h3>Words Found</h3>
      <ul>
        {foundWords.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>

      <h3>Missed Words</h3>
      <ul>
        {missedWords.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
