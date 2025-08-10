import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../lib/api'

export default function CollectionView() {
  const { id } = useParams()
  const [articles, setArticles] = useState([])

  useEffect(() => {
    api.get(`/api/collections/${id}/articles`).then(r => setArticles(r.data))
  }, [id])

  return (
    <div>
      <h2>Articles de la collection</h2>
      <ul>
        {articles.map(a => (
          <li key={a._id}>
            <a href={a.link} target="_blank" rel="noreferrer">{a.title}</a>
            {a.pubDate && <span> — {new Date(a.pubDate).toLocaleString()}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
