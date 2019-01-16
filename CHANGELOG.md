## 1.0.0-alpha.6
- Fix issue in which comments right before semi colon are not printed ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/11)).

## 1.0.0-alpha.5

- Fix `apex-ast-serializer` executables not having their execute bits set on *nix ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/10)).

## 1.0.0-alpha.4

- Support `WITH SECURITY_ENFORCED` in SOQL ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/9)).
- Fix `npm scripts` pointing to old files.

## 1.0.0-alpha.3

- Fix DML operation having double indents ([issue](https://github.com/dangmai/prettier-plugin-apex/issues/8)).
- Rename scripts to start and stop Apex Parser Server.

## 1.0.0-alpha.2

- Use Prettier's default options for `tabWidth` and `printWidth`.
- Invoke `apex-ast-serializer` directly by default,
with option to use Nailgun server.

## 1.0.0-alpha.1

- Initial release.
