type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMeta {
	[key: string]: any;
}

class Logger {
	private level: LogLevel;
	private format: 'console' | 'json';

	constructor() {
		// Default values based on environment
		const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
		this.level = isProduction ? 'warn' : 'info';
		this.format = 'json'; // Always use JSON format for structured logging

		console.log(
			`🔧 Logger initialized: level=${this.level}, format=${this.format}, isProduction=${isProduction}`
		);

		// Try to override with environment variables if available
		try {
			if (typeof process !== 'undefined' && process.env) {
				const envLevel = process.env.LOG_LEVEL;
				const envFormat = process.env.LOG_FORMAT;

				if (
					envLevel === 'debug' ||
					envLevel === 'info' ||
					envLevel === 'warn' ||
					envLevel === 'error'
				) {
					this.level = envLevel;
				}

				if (envFormat === 'console' || envFormat === 'json') {
					this.format = envFormat;
				}
			}
		} catch (error) {
			// Ignore environment variable errors in SSR context
			console.warn('Logger: Could not read environment variables, using defaults');
		}
	}

	private shouldLog(level: LogLevel): boolean {
		const levels = ['debug', 'info', 'warn', 'error'];
		return levels.indexOf(level) >= levels.indexOf(this.level);
	}

	private formatMessage(level: LogLevel, message: string, meta?: LogMeta): string {
		const timestamp = new Date().toISOString();
		const base = { timestamp, level, message };

		if (this.format === 'json') {
			return JSON.stringify({ ...base, ...meta });
		}

		const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
		return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
	}

	debug(message: string, meta?: LogMeta) {
		if (this.shouldLog('debug')) {
			console.debug(this.formatMessage('debug', message, meta));
		}
	}

	info(message: string, meta?: LogMeta) {
		if (this.shouldLog('info')) {
			console.info(this.formatMessage('info', message, meta));
		}
	}

	warn(message: string, meta?: LogMeta) {
		if (this.shouldLog('warn')) {
			console.warn(this.formatMessage('warn', message, meta));
		}
	}

	error(message: string, error?: Error, meta?: LogMeta) {
		if (this.shouldLog('error')) {
			const errorMeta = error
				? {
						error: error.message,
						stack: error.stack,
						...meta
					}
				: meta;
			console.error(this.formatMessage('error', message, errorMeta || {}));
		}
	}

	// Request logging helper
	request(method: string, url: string, statusCode: number, duration: number, meta?: LogMeta) {
		const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
		const message = `${method} ${url} ${statusCode} ${duration}ms`;

		switch (level) {
			case 'error':
				this.error(message, undefined, meta);
				break;
			case 'warn':
				this.warn(message, meta);
				break;
			case 'info':
			default:
				this.info(message, meta);
				break;
		}
	}
}

export const logger = new Logger();
