import { createWriteStream, mkdirSync } from 'fs';
import { get as httpsGet } from 'https';

export function downloadFile(url: string, destination: string, callback?: (error?: Error) => void): void {
    httpsGet(url, (response: import('http').IncomingMessage) => {
        console.debug('Downloading file \n...from:', url, '\n...to:', destination);
        if (response.statusCode === 200) {
            const dir = destination.substring(0, destination.lastIndexOf('/'));
            mkdirSync(dir, { recursive: true });
            const file = createWriteStream(destination);
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.debug('File downloaded to:', destination);
                if (callback) {
                    callback();
                }
            });
        } else if (response.statusCode === 301 || response.statusCode === 302) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
                console.debug('Redirecting to:', redirectUrl);
                downloadFile(redirectUrl, destination, callback);
            } else {
                throw new Error('Redirect response without location header');
            }
        } else {
            throw new Error(`Failed to download file: ${response.statusCode} ${response.statusMessage}`);
        }
    }).on('error', (err: NodeJS.ErrnoException) => {
        throw new Error(`Failed to download file: ${err.message}`);
    });
}
