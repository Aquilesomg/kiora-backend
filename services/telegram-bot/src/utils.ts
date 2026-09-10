/**
 * Escapa caracteres HTML para que Telegraf/Telegram los pueda enviar sin romper el parseo HTML.
 */
export function escapeHtml(text?: string | null): string {
    if (!text) return '';
    return String(text).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
}

/**
 * Limpia HTML y convierte texto Markdown básico a HTML compatible con Telegram.
 */
export function formatMessageToHtml(subject: string | undefined, htmlBody: string | undefined): string {
    const cleaned = (htmlBody || subject || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .trim();

    const cleanText = escapeHtml(cleaned)
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/__(.*?)__/g, '<b>$1</b>');

    return `<b>${escapeHtml(subject || '')}</b>\n\n${cleanText}`;
}
