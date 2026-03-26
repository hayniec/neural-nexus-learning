import { useState, useEffect } from 'react';
import './NodeLinker.css';
import type { LinkerData, LinkerNode } from '../../services/aiService';

import type { GameOptions } from './QuizGame';

interface NodeLinkerProps {
  levelData: LinkerData;
  onBack: () => void;
  onComplete?: (score: number, maxScore: number) => void;
  gameOptions?: GameOptions;
}

export default function NodeLinker({ levelData, onBack, onComplete, gameOptions }: NodeLinkerProps) {
  const [terms, setTerms] = useState<{ id: string; text: string; originalNode: LinkerNode }[]>([]);
  const [definitions, setDefinitions] = useState<{ id: string; text: string; originalNode: LinkerNode }[]>([]);
  
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  
  const [errorPair, setErrorPair] = useState<{ termId: string; defId: string } | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const [attemptsMap, setAttemptsMap] = useState<Record<string, number>>({});
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // Initialize and shuffle the lists on load
  useEffect(() => {
    if (!levelData || !levelData.nodes) return;

    // Create tracking structures
    const tNodes = levelData.nodes.map((n, i) => ({ id: `t_${i}`, text: n.term, originalNode: n }));
    const dNodes = levelData.nodes.map((n, i) => ({ id: `d_${i}`, text: n.definition, originalNode: n }));

    // Shuffle both lists independently
    setTerms([...tNodes].sort(() => Math.random() - 0.5));
    setDefinitions([...dNodes].sort(() => Math.random() - 0.5));
  }, [levelData]);

  // Fallback
  if (!levelData || !levelData.nodes || levelData.nodes.length === 0) {
    return (
      <div className="game-container">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Whoops!</h2>
          <p>The AI didn't generate any linker nodes for that text.</p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: '2rem' }}>Go Back</button>
        </div>
      </div>
    );
  }

  const maxScore = levelData.nodes.length * 150;

  const handleSelectTerm = (id: string) => {
    if (matchedIds.has(id) || failedIds.has(id) || errorPair) return;
    setSelectedTermId(id === selectedTermId ? null : id);
  };

  const handleSelectDef = (id: string) => {
    if (matchedIds.has(id) || failedIds.has(id) || errorPair) return;
    setSelectedDefId(id === selectedDefId ? null : id);
  };

  // Check for matches whenever both are selected
  useEffect(() => {
    if (selectedTermId && selectedDefId) {
      const termNode = terms.find(t => t.id === selectedTermId);
      const defNode = definitions.find(d => d.id === selectedDefId);

      if (termNode && defNode && termNode.originalNode === defNode.originalNode) {
        // Match successful!
        setMatchedIds(prev => new Set(prev).add(selectedTermId).add(selectedDefId));
        const attempts = (attemptsMap[selectedTermId] || 0) + 1;
        if (attempts === 1) {
          setScore(s => s + 150);
        } else {
          setScore(s => s + 50); // Less points if retried
        }
        setSelectedTermId(null);
        setSelectedDefId(null);

        // Check win condition
        if (matchedIds.size + failedIds.size + 2 >= terms.length * 2) {
          setTimeout(() => setIsFinished(true), 1000);
        }
      } else {
        // Match failed
        const isTest = gameOptions?.isTestMode || false;
        const maxTries = gameOptions?.maxAttempts || 0;
        const termAttempts = (attemptsMap[selectedTermId] || 0) + 1;
        setAttemptsMap(prev => ({ ...prev, [selectedTermId]: termAttempts }));

        setErrorPair({ termId: selectedTermId, defId: selectedDefId });

        setTimeout(() => {
          if (isTest || (maxTries > 0 && termAttempts >= maxTries)) {
            setFailedIds(prev => new Set(prev).add(selectedTermId).add(selectedDefId));
            if (matchedIds.size + failedIds.size + 2 >= terms.length * 2) {
              setIsFinished(true);
            }
          }
          setErrorPair(null);
          setSelectedTermId(null);
          setSelectedDefId(null);
        }, 800);
      }
    }
  }, [selectedTermId, selectedDefId, terms, definitions, matchedIds.size, failedIds.size, attemptsMap, gameOptions]);

  if (isFinished) {
    return (
      <div className="game-container">
        <div className="victory-screen glass-panel">
          <h2>Network Linked! 🔗</h2>
          <div className="final-score">Synapses Forged: {score} / {maxScore}</div>
          <p>You have perfectly aligned all knowledge nodes.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
            {onComplete && (
              <button className="btn-primary" onClick={() => onComplete(score, maxScore)}>Claim Rewards 💎</button>
            )}
            <button className="btn-secondary" onClick={onBack}>Exit without Saving</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <button className="btn-back" onClick={onBack}>← Return to Hub</button>
        <h2>{levelData.title}</h2>
        <div className="score-display">⚡ {score}</div>
      </div>

      <div className="linker-board glass-panel">
        <div className="linker-instructions">
          <h3>Match the Nodes</h3>
          <p>Select a term on the left, then select its matching definition on the right to forge a synapse connection.</p>
        </div>

        <div className="linker-columns">
          <div className="linker-list terms-list">
            {terms.map(t => {
              const isSelected = selectedTermId === t.id;
              const isMatched = matchedIds.has(t.id);
              const isFailed = failedIds.has(t.id);
              const isError = errorPair?.termId === t.id;

              return (
                <button
                  key={t.id}
                  className={`linker-item ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''} ${isFailed ? 'failed' : ''} ${isError ? 'error' : ''}`}
                  onClick={() => handleSelectTerm(t.id)}
                  disabled={isMatched || isFailed}
                >
                  {t.text}
                </button>
              );
            })}
          </div>

          <div className="linker-divider">
            <div className="energy-beam"></div>
          </div>

          <div className="linker-list defs-list">
            {definitions.map(d => {
              const isSelected = selectedDefId === d.id;
              const isMatched = matchedIds.has(d.id);
              const isFailed = failedIds.has(d.id);
              const isError = errorPair?.defId === d.id;

              return (
                <button
                  key={d.id}
                  className={`linker-item ${isSelected ? 'selected' : ''} ${isMatched ? 'matched' : ''} ${isFailed ? 'failed' : ''} ${isError ? 'error' : ''}`}
                  onClick={() => handleSelectDef(d.id)}
                  disabled={isMatched || isFailed}
                >
                  {d.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
