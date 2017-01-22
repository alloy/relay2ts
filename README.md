```
██████╗ ███████╗██╗      █████╗ ██╗   ██╗██████╗ ████████╗███████╗
██╔══██╗██╔════╝██║     ██╔══██╗╚██╗ ██╔╝╚════██╗╚══██╔══╝██╔════╝
██████╔╝█████╗  ██║     ███████║ ╚████╔╝  █████╔╝   ██║   ███████╗
██╔══██╗██╔══╝  ██║     ██╔══██║  ╚██╔╝  ██╔═══╝    ██║   ╚════██║
██║  ██║███████╗███████╗██║  ██║   ██║   ███████╗   ██║   ███████║
╚═╝  ╚═╝╚══════╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝   ╚═╝   ╚══════╝
```

This CLI tool takes the GraphQL query fragments of your Relay container and generates a TypeScript interface for them.

It sacrifices DRYness in favour of exactness, by adding these interfaces into the files that contain the queries. If you
prefer a single file that describes your full GraphQL schema with an interface per type, take a look at [gql2ts].

## Installation

```sh
$ npm install -g relay2ts
$ relay2ts --help
```

## Configuration

In addition to the pure CLI options, you can also configure the GraphQL schema location via [these methods][gqlconfig],
and the interface name can be configured in your `package.json` with:

```json
{
  …
  "dependencies": { … },
  "graphql": {
    "file": "data/schema.json",
    "tsInterfaceName": "RelayProps"
  }
}
```

## Example

1. Given a source file that contains a query like the following:

    ```js
    export default Relay.createContainer(ArtworkGrid, {
      fragments: {
        artworks: () => Relay.QL`
          fragment on Artwork @relay(plural: true) {
            id
            title
            artists {
              name
            }
            image {
              aspect_ratio
            }
            ${Artwork.getFragment("artwork")}
          }
        `,
      },
    })
    ```

2. And a GraphQL schema that contains:

    ```graphql
    type Artwork {
      id: String!
      title: String!
      artists: [Artist]
      image: Image
    }

    type Artist {
      name: String!
    }

    type Image {
      aspect_ratio: Float
    }
    ```

3. Presto, the following TypeScript interface gets generated:

    ```ts
    interface IRelayProps {
      artworks: Array<{
        id: string,
        title: string,
        artists: Array<{
          name: string,
        }>,
        image: {
          aspect_ratio: number | null,
        } | null,
      }>,
    }
    ```

It is important to note that, because Relay only exposes the exact fields that _this_ component requested, the interface
also only contains these fields and not also those of the `Artwork` component.

## Usage

Initially the interface will get appended to the file. However, afterwards you are free to move it around in the file,
subsequent updates will replace the interface where ever it’s located.

You shouldn’t try to use it as your main props interface, unless your component really only has Relay props, rather do:

```ts
interface Props extends IRelayProps {
  onClick: () => void
}

class ArtworkGrid extends React.Component<Props, null> {
  …
}
```

## License

[MIT]

Copyright 2017 Artsy, Eloy Duran <eloy.de.enige@gmail.com>

[gql2ts]: https://github.com/avantcredit/gql2ts
[gqlconfig]: https://github.com/graphcool/graphql-config/blob/master/README.md#usage
[MIT]: LICENSE
