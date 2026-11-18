/**
 * The mail as Gmail receives it (RFC 5322 + MIME): plain text and attachments.
 * Header values with a line break are refused, never cleaned, because a break
 * is how someone adds a hidden Bcc.
 */
export interface MailAttachment {
    fileName: string;
    contentType: string;
    content: Uint8Array;
}
export interface MailMessage {
    from: string;
    fromName?: string;
    to: string[];
    cc?: string[];
    subject: string;
    text: string;
    attachments?: MailAttachment[];
}
/** Gmail's limit for a message sent through the upload endpoint. */
export declare const GMAIL_MAX_MESSAGE_BYTES: number;
export declare function buildMimeMessage(message: MailMessage, boundary?: string): string;
