import React, { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";

export const TicketQr = ({ id, baseUrl }) => {
  const value = useMemo(() => {
    const root = baseUrl || window.location.origin;
    return `${root}/consulta/${id}`;
  }, [id, baseUrl]);

  if (!id) {
    return null;
  }

  return (
    <div className="qr-card">
      <QRCodeCanvas value={value} size={160} level="H" includeMargin />
      <div className="qr-meta">
        <div className="qr-title">QR de consulta</div>
        <div className="qr-value">{value}</div>
      </div>
    </div>
  );
};
