import { betterAuth } from "better-auth";
import { PUBLIC_API_URL } from "$env/static/public";

export const auth = betterAuth({
	baseURL: PUBLIC_API_URL || "http://localhost:8080",
	
	// Use MountainHR backend auth endpoints
	endpoints: {
		signIn: "/auth/login",
		signUp: "/auth/register", 
		signOut: "/auth/logout",
		getSession: "/auth/verify",
	},

	// Email and password authentication
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Set to true in production
		passwordResetUrl: "/reset-password",
		verifyEmailUrl: "/verify-email",
		
		// Custom password validation
		minPasswordLength: 8,
		maxPasswordLength: 128,
		
		// Custom email validation
		validateEmail: (email: string) => {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		},
		
		// Handle successful registration
		onSignUp: async (user, request) => {
			console.log("User registered:", user.email);
			// You can add additional logic here like sending welcome emails
		},
		
		// Handle successful login
		onSignIn: async (user, request) => {
			console.log("User signed in:", user.email);
		},
		
		// Handle signout
		onSignOut: async (user, request) => {
			console.log("User signed out");
		},
	},

	// Session configuration
	session: {
		cookieName: "mountainhr-session",
		maxAge: 60 * 60 * 24, // 24 hours
		updateAge: 60 * 60,   // 1 hour
		expiresIn: 60 * 60 * 24, // 24 hours
	},

	// Database configuration - we'll let GelDB handle this
	database: {
		// We don't need to configure a database here since GelDB auth handles it
		provider: "custom" as any,
	},

	// Security settings
	advanced: {
		crossSubDomainCookies: {
			enabled: false, // Set to true if using subdomains
		},
		disableDefaultSessionUpdate: false,
		useSecureCookies: process.env.NODE_ENV === "production",
		generateId: () => crypto.randomUUID(),
	},

	// Rate limiting
	rateLimit: {
		window: 15 * 60, // 15 minutes
		max: 100, // requests per window
		storage: "memory", // Use Redis in production
	},

	// CSRF protection
	csrf: {
		enabled: true,
		cookieName: "mountainhr-csrf",
	},

	// Logger configuration
	logger: {
		level: process.env.NODE_ENV === "development" ? "debug" : "warn",
		disabled: false,
	},

	// Custom error messages
	errorMessages: {
		INVALID_EMAIL: "Please enter a valid email address",
		INVALID_PASSWORD: "Password must be at least 8 characters long",
		EMAIL_ALREADY_EXISTS: "An account with this email already exists",
		INVALID_CREDENTIALS: "Invalid email or password",
		EMAIL_NOT_VERIFIED: "Please verify your email address before signing in",
		ACCOUNT_LOCKED: "Your account has been temporarily locked",
		SESSION_EXPIRED: "Your session has expired, please sign in again",
	},

	// Plugins and additional features
	plugins: [
		// We can add plugins here for features like:
		// - Two-factor authentication
		// - OAuth providers (Google, GitHub, etc.)
		// - Account linking
		// - Magic links
	],
});