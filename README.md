**Please note: This app is being developed. There may be bugs, and everything is subject to change.**

# Snapshot

This is a sample camera app to demonstrate camera functionality in the context of a Progressive Web App.

You can see a reasonably stable version at https://snapshot-stable.firebaseapp.com/

![b8f80bc5-42e3-4d48-bb7f-8441b93ba474](https://user-images.githubusercontent.com/393358/29221455-bba48182-7eb6-11e7-95af-625e263b7836.png)


## Building the code

First install all of the dependencies
```
npm install
```

You can then build the main JS bundle using rollup
```
rollup -c
```

You can also have this as a watch task via `rollup-watch`
```
rollup -cw
```

The project expects to be served with the contents of the `public` folder as the root. For example, using the `http-server` node package:
```
npm install -g http-server
http-server -p 8080 public/
```

The site would then be available at http://localhost:8080/
