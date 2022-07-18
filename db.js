const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);
/*MODELS*/
const User = conn.define('user', {
  username: STRING,
  password: STRING,
});
const Note = conn.define('note', {
  text: STRING,
});
/* Associations*/

Note.belongsTo(User);
User.hasMany(Note);

/*Methods*/
User.byToken = async (token) => {
  try {
    const payload = await jwt.verify(token, process.env.JWT);
    console.log('payload', payload);
    const user = await User.findByPk(payload.userId);
    if (user) {
      console.log('user', user);
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  const match = await bcrypt.compare(password, user.password);
  if (user && match) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT);
    console.log('token is ', token);

    return token;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};
User.beforeCreate(async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  user.password = hashedPassword;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const notes = [
    { text: 'hello world' },
    { text: 'meet me out back in 20' },
    { text: 'this is a spicy note' },
    { text: 'alec is the best explainer' },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const [helloNote, meetMeNote, spicyNote, alecNote] = await Promise.all(
    notes.map((note) => Note.create(note))
  );
  await lucy.setNotes([spicyNote, alecNote]),
    await moe.setNotes(helloNote),
    await larry.setNotes(meetMeNote);
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      helloNote,
      meetMeNote,
      spicyNote,
      alecNote,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
