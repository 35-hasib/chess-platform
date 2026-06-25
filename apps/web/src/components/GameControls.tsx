"use client";

interface Props {
  canAbort: boolean;
  drawOffered: boolean; // opponent offered us a draw
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onDeclineDraw: () => void;
  onAbort: () => void;
}

export function GameControls({
  canAbort,
  drawOffered,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onDeclineDraw,
  onAbort,
}: Props) {
  if (drawOffered) {
    return (
      <div className="bg-panel rounded-md p-3 flex items-center justify-between gap-2">
        <span className="text-sm">Opponent offers a draw</span>
        <div className="flex gap-2">
          <button onClick={onAcceptDraw} className="btn-primary text-sm py-1 px-3">
            Accept
          </button>
          <button
            onClick={onDeclineDraw}
            className="btn-secondary text-sm py-1 px-3"
          >
            Decline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {canAbort ? (
        <button onClick={onAbort} className="btn-secondary flex-1 text-sm py-1.5">
          Abort
        </button>
      ) : (
        <button
          onClick={onOfferDraw}
          className="btn-secondary flex-1 text-sm py-1.5"
        >
          ½ Offer draw
        </button>
      )}
      <button onClick={onResign} className="btn-danger flex-1 text-sm py-1.5">
        🏳 Resign
      </button>
    </div>
  );
}
