import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Divider, IconButton, List, ListItem, ListItemText, Toolbar, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { makeStyles } from 'tss-react/mui';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useCatchCallback } from '../reactHelper';
import { sessionActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { formatTime } from '../common/util/formatter';

const useStyles = makeStyles()((theme) => ({
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: theme.palette.background.paper,
  },
  empty: {
    padding: theme.spacing(3),
    textAlign: 'center',
  },
}));

/**
 * HiTrack: список объявлений, присланных администратором.
 * Хранятся в профиле пользователя, поэтому доступны и после повторного входа.
 */
const AnnouncementsPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const user = useSelector((state) => state.session.user);

  const announcements = useMemo(() => {
    try {
      return JSON.parse(user.attributes.announcements || '[]').slice().reverse();
    } catch {
      return [];
    }
  }, [user]);

  // отметка о прочтении хранится в профиле, поэтому счётчик одинаков на всех устройствах
  const markRead = useCatchCallback(async () => {
    if (!announcements.length) {
      return;
    }
    const latest = Math.max(...announcements.map((item) => item.time));
    if ((user.attributes.announcementsReadAt || 0) >= latest) {
      return;
    }
    const updated = {
      ...user,
      attributes: { ...user.attributes, announcementsReadAt: latest },
    };
    const response = await fetchOrThrow(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    dispatch(sessionActions.updateUser(await response.json()));
  }, [announcements, user, dispatch]);

  useEffect(() => {
    markRead();
  }, [markRead]);

  return (
    <div className={classes.page}>
      <Toolbar>
        <IconButton edge="start" onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">{t('serverAnnouncement')}</Typography>
      </Toolbar>
      <Divider />
      {announcements.length ? (
        <List>
          {announcements.map((item) => (
            <ListItem divider key={item.time}>
              <ListItemText
                primary={item.subject || t('serverAnnouncement')}
                secondary={`${item.body}\n${formatTime(new Date(item.time), 'minutes')}`}
                secondaryTypographyProps={{ style: { whiteSpace: 'pre-line' } }}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography className={classes.empty} color="textSecondary">
          {t('sharedNoData')}
        </Typography>
      )}
    </div>
  );
};

export default AnnouncementsPage;
