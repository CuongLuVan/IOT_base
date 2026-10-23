const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: FacebookStrategy } = require('passport-facebook');
const knex = require('./knex.js');

let configured = false;
const enabledProviders = new Set();

function configValue(primary, legacy) {
  return process.env[primary] || process.env[legacy];
}

function socialEmail(profile) {
  const entry = Array.isArray(profile.emails) ? profile.emails.find((item) => item && item.value) : null;
  return entry && String(entry.value).trim().toLowerCase();
}

async function findOrCreateCustomer(profile, provider) {
  const email = socialEmail(profile);
  if (!email) throw new Error('SOCIAL_EMAIL_UNAVAILABLE');

  return knex.transaction(async (trx) => {
    const customer = await trx('customer')
      .where('email', email)
      .where(function () {
        this.where('deleteflag', 0).orWhereNull('deleteflag');
      })
      .first()
      .forUpdate();

    if (customer) {
      if (typeof customer.username !== 'string' || customer.username.indexOf(provider + '_') !== 0) {
        throw new Error('SOCIAL_EMAIL_ALREADY_REGISTERED');
      }
      return customer;
    }

    const username = provider + '_' + String(profile.id);
    const inserted = await trx('customer').insert({
      username,
      email,
      password: '',
      phone: null,
      avatar: Array.isArray(profile.photos) && profile.photos[0] ? profile.photos[0].value || null : null,
      fullname: profile.displayName || email,
      permission_id: 0,
      address: null,
      note: 'Registered through ' + provider,
      created_at: trx.fn.now(),
      updated_at: trx.fn.now(),
      deleteflag: 0
    });
    const customerId = Array.isArray(inserted) ? inserted[0] : inserted;
    await trx('customer').where('customer_id', customerId).update({
      id_created: customerId,
      id_updated: customerId
    });
    return trx('customer').where('customer_id', customerId).first();
  });
}

function registerGoogle() {
  const clientID = configValue('GOOGLE_CLIENT_ID', 'GG_CLIENT_ID');
  const clientSecret = configValue('GOOGLE_CLIENT_SECRET', 'GG_CLIENT_SECRET');
  if (!clientID || !clientSecret) return;

  passport.use('google', new GoogleStrategy({
    clientID,
    clientSecret,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      done(null, await findOrCreateCustomer(profile, 'google'));
    } catch (error) {
      done(error);
    }
  }));
  enabledProviders.add('google');
}

function registerFacebook() {
  const clientID = configValue('FACEBOOK_APP_ID', 'FB_APP_ID');
  const clientSecret = configValue('FACEBOOK_APP_SECRET', 'FB_APP_SECRET');
  if (!clientID || !clientSecret) return;

  passport.use('facebook', new FacebookStrategy({
    clientID,
    clientSecret,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'displayName', 'photos']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      done(null, await findOrCreateCustomer(profile, 'facebook'));
    } catch (error) {
      done(error);
    }
  }));
  enabledProviders.add('facebook');
}

function configurePassport() {
  if (configured) return passport;
  configured = true;
  registerGoogle();
  registerFacebook();

  passport.serializeUser((customer, done) => done(null, customer.customer_id));
  passport.deserializeUser(async (customerId, done) => {
    try {
      const customer = await knex('customer')
        .where('customer_id', customerId)
        .where(function () {
          this.where('deleteflag', 0).orWhereNull('deleteflag');
        })
        .first();
      done(null, customer || false);
    } catch (error) {
      done(error);
    }
  });
  return passport;
}

module.exports = {
  configurePassport,
  isProviderEnabled: (provider) => enabledProviders.has(provider)
};
