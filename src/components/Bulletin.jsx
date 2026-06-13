import React from 'react';
import { niceDate } from '../utils/date';

const clean = (value, fallback = 'TBA') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

function Row({ label, value, italic = false }) {
  return (
    <div className="bulletin-row">
      <div className="bulletin-row-label">{label}</div>
      <div className={italic ? 'bulletin-row-value italic' : 'bulletin-row-value'}>{clean(value)}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="bulletin-section">
      <h2>{title}</h2>
      <div className="bulletin-section-body">{children}</div>
    </section>
  );
}

function ContentItem({ item }) {
  return (
    <article className="bulletin-content-item">
      {item.imageUrl && <img className="bulletin-content-image" src={item.imageUrl} alt="" />}
      <h3>{item.title}</h3>
      {item.description && <p>{item.description}</p>}
    </article>
  );
}

export function BulletinMarkup({ roster, announcements = [], notices = [], events = [], nextRoster = null, date }) {
  const bulletinDate = roster?.date || date;
  const sermonTitle = roster?.sermonTitle || roster?.preacherDetails?.sermonTitle;
  const scripture = roster?.scripture || roster?.preacherDetails?.scripture;
  const theme = roster?.theme || roster?.preacherDetails?.theme;
  const verse = roster?.scriptureVerse || 'Thy word is a lamp unto my feet, and a light unto my path.';
  const verseRef = roster?.scriptureReference || 'Psalm 119:105';

  return (
    <div className="bulletin-print bulletin-landscape">
      <div className="bulletin-page bulletin-left-page">
        <header className="bulletin-header">
          <h1>Preston SDA Church</h1>
          <p>Sabbath Bulletin · {niceDate(bulletinDate)}</p>
        </header>

        <Section title="Sabbath School">
          <Row label="Sabbath School Leader" value={roster?.sabbathSchool} />
          <Row label="Hymn 1" value={roster?.sabbathSchoolHymn || roster?.openingHymn} />
          <Row label="Lesson" value={roster?.sabbathSchoolLesson} />
          <div className="bulletin-mission">{clean(roster?.missionStatement, 'Mission Statement')}</div>
        </Section>

        <Section title="Divine Service">
          <Row label="Song Leader" value={roster?.songLeader} />
          <Row label="Hymn 1" value={roster?.hymn1 || roster?.openingHymn} />
          <Row label="Hymn 2" value={roster?.hymn2} />
          <Row label="Hymn 3" value={roster?.hymn3} />
          <Row label="First Hymn" value={roster?.firstHymn || roster?.openingHymn} />
          <Row label="Offering" value={roster?.offering} />
          <Row label="Children's Story" value={roster?.childrensStory} />
          <Row label="Preacher" value={roster?.preacher} />
          <Row label="Sermon" value={sermonTitle ? `"${sermonTitle}"` : 'TBA'} italic />
          {scripture && <Row label="Scripture" value={scripture} />}
          {theme && <Row label="Theme" value={theme} />}
          <Row label="Benediction" value={roster?.benediction || roster?.preacher} />
        </Section>

        {roster?.specialEvent && (
          <Section title="Special Item">
            <p className="bulletin-copy">{roster.specialEvent}</p>
          </Section>
        )}

        <blockquote className="bulletin-verse">“{verse}” — {verseRef}</blockquote>
      </div>

      <div className="bulletin-page bulletin-right-page">
        <Section title="Announcements">
          {announcements.length ? announcements.slice(0, 3).map(item => <ContentItem item={item} key={item.id || item.title} />) : <p className="bulletin-muted">No announcements this week.</p>}
        </Section>

        <Section title="Notices">
          {notices.length ? notices.slice(0, 3).map(item => <ContentItem item={item} key={item.id || item.title} />) : <p className="bulletin-muted">No notices this week.</p>}
        </Section>

        {events.length > 0 && (
          <Section title="Upcoming Events">
            <div className="bulletin-event-list">
              {events.slice(0, 4).map(event => (
                <Row key={event.id || event.title} label={niceDate(event.date)} value={event.title} />
              ))}
            </div>
          </Section>
        )}

        {nextRoster && (
          <Section title={`Next Sabbath - ${niceDate(nextRoster.date)}`}>
            <Row label="Preaching" value={nextRoster.preacher} />
            <Row label="Sabbath School" value={nextRoster.sabbathSchool} />
            <Row label="Song Leader" value={nextRoster.songLeader} />
            <Row label="Elder" value={nextRoster.elder} />
          </Section>
        )}

        <footer className="bulletin-footer">94 David St, Preston VIC 3072 · prestonsda.org.au</footer>
      </div>
    </div>
  );
}
