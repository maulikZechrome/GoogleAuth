import express from "express"
import dotenv from "dotenv"
import session from "express-session"
import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20"
import { google } from "googleapis"
const rootRouter = express.Router()
dotenv.config()

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI
let detailedMessages:any[] =[]
// Configure Passport with Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: CLIENT_ID as string,
      clientSecret: CLIENT_SECRET as string,
      callbackURL: REDIRECT_URI
    },
    async (accessToken, refreshToken, profile, done) => {
      // Save the profile or user information to the database
      const oauth2Client = new google.auth.OAuth2()
      oauth2Client.setCredentials({ access_token: accessToken })
      const peopleService = google.people({ version: "v1", auth: oauth2Client })
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      try {
        const me = await peopleService.people.get({
          resourceName: "people/me",
          personFields:
            "names,emailAddresses,phoneNumbers,birthdays,photos,addresses,genders,organizations,occupations,biographies,urls,events,relations,userDefined,imClients,taglines,coverPhotos"
        })
        console.log({
          accessToken,
          refreshToken,
          profile,
          me: me.data // Log only the data part
        })
        let messages: any[] = [];
        let nextPageToken: any = null;

        // do {
          const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5, // Fetch 5 emails per request
            // pageToken: nextPageToken,
            // labelIds: ['UNREAD'],
          });

          messages = messages.concat(res.data.messages || []);
          // nextPageToken = res.data.nextPageToken;
        // } while (nextPageToken);

        // Fetch details for each message
        detailedMessages = await Promise.all(
          messages.map(async (message) => {
            const msg = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
            });
            return msg.data;
          })
        );

        console.log('Messages:', detailedMessages);

        return done(null, profile)
      } catch (error) {
        console.log(error)
        return done(error, false)
      }
    }
  )
)

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user as any)
})

rootRouter.use(
  session({ secret: "CLIENT_SECRET", resave: false, saveUninitialized: false })
)
rootRouter.use(passport.initialize())
rootRouter.use(passport.session())

rootRouter.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "profile",
      "email",
      "openid",
      "https://www.googleapis.com/auth/user.birthday.read",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/contacts.readonly",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/user.addresses.read",
      "https://www.googleapis.com/auth/user.phonenumbers.read",
      "https://www.googleapis.com/auth/user.gender.read",
      "https://www.googleapis.com/auth/user.organization.read",
      "https://www.googleapis.com/auth/user.emails.read",
    ],
    accessType: "offline",
    prompt: "consent"
  })
)

rootRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/") // or any route
  }
)

rootRouter.get("/", (req, res) => {
  res.status(200).send(detailedMessages)
  // .json({success:true,detailedMessages})
})

export default rootRouter
