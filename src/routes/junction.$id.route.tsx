import { Link, useParams } from 'react-router'
import { useJunctions } from '../features/map/hooks/useJunctions'

export function JunctionRoute() {
  const { junctionId } = useParams()
  const { data: junctions, isLoading } = useJunctions()

  if (isLoading) return <p className="route-status">Loading...</p>

  const junction = junctions?.find((item) => item.id === junctionId)

  if (!junction) {
    return (
      <div className="junction-detail">
        <p>No junction found with id "{junctionId}".</p>
        <Link to="/">Back to map</Link>
      </div>
    )
  }

  return (
    <article className="junction-detail">
      <Link to="/" className="junction-detail__back">
        &larr; Back to map
      </Link>
      <h1>{junction.name}</h1>
      <p className="junction-detail__status">Status: {junction.status}</p>
      <p>{junction.description}</p>
      <h2>Sources</h2>
      <ul>
        {junction.sources.map((source) => (
          <li key={source}>{source}</li>
        ))}
      </ul>
    </article>
  )
}
