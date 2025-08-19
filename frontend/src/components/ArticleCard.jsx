export default function ArticleCard({ article }) {
  const {
    title,
    imageUrl,
    source,
    publishedAt,
    excerpt,
    tags = [],
    href = '#',
  } = article || {};

  const date = publishedAt
    ? new Date(publishedAt).toLocaleDateString()
    : '';

  return (
    <a className="article-card" href={href} target="_blank" rel="noreferrer">
      <div className="article-card__media">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" />
        ) : (
          <div className="article-card__placeholder" aria-hidden="true">🦋</div>
        )}
      </div>
      <div className="article-card__body">
        <h3 className="article-card__title">{title}</h3>
        <p className="article-card__excerpt">{excerpt}</p>
        <div className="article-card__meta">
          <span className="badge">{source || '—'}</span>
          {date && <span className="muted">{date}</span>}
        </div>
        {tags?.length > 0 && (
          <div className="article-card__tags">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="tag">#{t}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
