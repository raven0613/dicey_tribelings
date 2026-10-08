import {
  DECISION_LABELS,
  OFFER_SOURCE_LABELS,
  STICKER_POSITION_LABELS,
} from '../../configs/telemetryConfig';
import type {
  DecisionRecord,
  OfferRecord,
  StickerPosition,
} from '../../service/telemetry/decisionTypes';
import type { RunRecord } from '../../service/telemetry/types';
import { ActivityDetails } from './ActivityDetails';
import { duration, number } from './format';

const position = (value: StickerPosition | null) =>
  value
    ? `${STICKER_POSITION_LABELS[value.kind]}${value.diceName ? ` · ${value.diceName} 第 ${value.faceIndex! + 1} 面` : ''}${value.direction ? ` · ${value.direction}` : ''}`
    : '持有範圍外';
const resourceLabels = { gold: '金幣', hp: 'HP', control: 'Control' } as const;

function DecisionDetails({
  decision,
  offer,
  run,
}: {
  decision: DecisionRecord;
  offer?: OfferRecord;
  run: RunRecord;
}) {
  const chosen = offer?.options.find((option) => option.id === decision.choiceId);
  const changes = Object.entries(decision.resources).filter(
    ([, value]) => value.before !== value.after,
  );
  return (
    <details>
      <summary>
        {duration(decision.activeMs)} · {DECISION_LABELS[decision.kind]}
        <span>
          {decision.label ?? chosen?.name ?? decision.items?.map((item) => item.name).join('、')}
          {decision.round !== undefined && ` · 第 ${decision.round} 回合`}
        </span>
      </summary>
      <p className="telemetry-note">{OFFER_SOURCE_LABELS[decision.source]}</p>
      {changes.map(([key, value]) => (
        <p key={key}>
          {resourceLabels[key as keyof typeof resourceLabels]} {number(value.before)} →{' '}
          {number(value.after)}（{value.after > value.before ? '+' : ''}
          {number(value.after - value.before)}）
        </p>
      ))}
      {!!decision.items?.length && (
        <p>結果：{decision.items.map((item) => item.name).join('、')}</p>
      )}
      {decision.changes.map((change, index) => (
        <p key={index}>
          {change.item.name}：{position(change.from)} → {position(change.to)}
        </p>
      ))}
      {decision.rerolls?.map((reroll, index) => {
        const face = (value: typeof reroll.before) =>
          `${run.catalog?.creatures[value.creature]?.name ?? value.creature} ${number(value.baseValue)}（第 ${value.faceIndex + 1} 面）`;
        return (
          <p key={index}>
            {reroll.diceName} · {{ manual: '手動', teacher: '老師', chain: '連鎖' }[reroll.reason]}
            ：{face(reroll.before)} → {face(reroll.after)} · 原始落點第 {reroll.rolledFaceIndex + 1}{' '}
            面
          </p>
        );
      })}
      {offer && (
        <p className="telemetry-note">
          對應候選批次 #{offer.id + 1}
          {chosen ? ` · 選擇 ${chosen.name}` : ''}
        </p>
      )}
    </details>
  );
}

export function DecisionTimeline({ run }: { run: RunRecord }) {
  if (!run.decisions || !run.offers)
    return (
      <section className="telemetry-section">
        <h4>決策歷程</h4>
        <p className="telemetry-note">未記錄</p>
      </section>
    );
  return (
    <section className="telemetry-section">
      <h4>決策歷程</h4>
      {run.visits.map((visit, index) => {
        const decisions = run.decisions!.filter(
          (item) => item.location.nodeId === visit.location.nodeId,
        );
        const offers = run.offers!.filter((item) => item.location.nodeId === visit.location.nodeId);
        return (
          <details key={index}>
            <summary>
              {visit.location.regionName} · {visit.location.title}
              <span>{decisions.length} 次操作</span>
            </summary>
            <ActivityDetails totals={visit.activityMs} />
            {!!offers.length && (
              <details>
                <summary>
                  曾出現的候選與商品<span>{offers.length} 批</span>
                </summary>
                {offers.map((offer) => (
                  <div className="telemetry-offer" key={offer.id}>
                    <strong>
                      #{offer.id + 1} {OFFER_SOURCE_LABELS[offer.source]} ·{' '}
                      {duration(offer.activeMs)}
                    </strong>
                    {offer.options.map((option) => (
                      <p key={option.id}>
                        {option.name}
                        {option.price !== undefined && ` · ${option.price} 金幣`}
                        {!!option.hiddenCount && ` · 隱藏 ${option.hiddenCount} 張`}
                        {option.visibleItems
                          .filter((item) => item.name !== option.name)
                          .map((item) => ` · ${item.name}`)
                          .join('')}
                      </p>
                    ))}
                  </div>
                ))}
              </details>
            )}
            {decisions.map((decision) => (
              <DecisionDetails
                key={decision.id}
                decision={decision}
                run={run}
                offer={run.offers!.find((offer) => offer.id === decision.offerId)}
              />
            ))}
            {!offers.length && !decisions.length && <p className="telemetry-note">尚無選擇紀錄</p>}
          </details>
        );
      })}
    </section>
  );
}
