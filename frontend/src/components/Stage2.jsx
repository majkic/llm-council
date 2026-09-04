import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './Stage2.css';

function normalizeRankingText(text) {
  return typeof text === 'string' ? text : '';
}

export default function Stage2({ rankings, labelToModel, aggregateRankings }) {
  const [activeTab, setActiveTab] = useState(0);

  if (!Array.isArray(rankings) || rankings.length === 0) {
    return null;
  }

  const activeRanking = rankings[activeTab] || rankings[0];

  return (
    <div className="stage stage2">
      <h3 className="stage-title">Stage 2: Peer Rankings</h3>

      <h4>Raw Evaluations</h4>
      <p className="stage-description">
        Each model evaluated all responses (anonymized as Response A, B, C, etc.) and provided rankings.
        Response labels remain anonymous in this stage to avoid bias.
      </p>

      <div className="tabs">
        {rankings.map((rank, index) => (
          <button
            key={index}
            className={`tab ${activeTab === index ? 'active' : ''}`}
            onClick={() => setActiveTab(index)}
          >
            {String(rank.model || 'Unknown model').split('/')[1] || String(rank.model || 'Unknown model')}
          </button>
        ))}
      </div>

      <div className="tab-content">
        <div className="ranking-model">
          {activeRanking.model || 'Unknown model'}
        </div>
        <div className="ranking-content markdown-content">
          <ReactMarkdown>
            {normalizeRankingText(activeRanking.ranking)}
          </ReactMarkdown>
        </div>

        {Array.isArray(activeRanking.parsed_ranking) &&
         activeRanking.parsed_ranking.length > 0 && (
          <div className="parsed-ranking">
            <strong>Extracted Ranking:</strong>
            <ol>
              {activeRanking.parsed_ranking.map((label, i) => (
                <li key={i}>
                  {label}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {Array.isArray(aggregateRankings) && aggregateRankings.length > 0 && (
        <div className="aggregate-rankings">
          <h4>Aggregate Rankings (Street Cred)</h4>
          <p className="stage-description">
            Combined results across all peer evaluations (lower score is better):
          </p>
          <div className="aggregate-list">
            {aggregateRankings.map((agg, index) => (
              <div key={index} className="aggregate-item">
                <span className="rank-position">#{index + 1}</span>
                <span className="rank-model">
                  {String(agg.model || 'Unknown model').split('/')[1] || String(agg.model || 'Unknown model')}
                </span>
                <span className="rank-score">
                  Avg: {Number(agg.average_rank || 0).toFixed(2)}
                </span>
                <span className="rank-count">
                  ({Number(agg.rankings_count || 0)} votes)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
