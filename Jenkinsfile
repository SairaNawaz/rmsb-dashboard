pipeline {
    agent any

    environment {
        REGISTRY       = 'ghcr.io'
        OWNER          = 'sairanawaz'
        DEPLOY_PATH    = 'jenkins/rmsb-dashboard'
        VM_USER        = 'ubuntu'
        VM_HOST        = '149.118.156.155'
        VITE_APP_NAME  = 'Microservice Hosting via Jenkins'
        VITE_API_GATEWAY_URL = 'https://microservces.duckdns.org'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Push Frontend') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        echo $GITHUB_TOKEN | docker login ghcr.io -u sairanawaz --password-stdin
                        docker build \
                            --platform linux/arm64 \
                            --build-arg VITE_APP_NAME="$VITE_APP_NAME" \
                            --build-arg VITE_API_GATEWAY_URL="$VITE_API_GATEWAY_URL" \
                            --build-arg VITE_ADMIN_EMAILS="saira.nawaz@kloudius.com" \
                            -t $REGISTRY/$OWNER/rmsb-frontend:latest \
                            ./frontend
                        docker push $REGISTRY/$OWNER/rmsb-frontend:latest
                    '''
                }
            }
        }

        stage('Build & Push Gateway') {
            steps {
                withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                    sh '''
                        docker build \
                            --platform linux/arm64 \
                            -t $REGISTRY/$OWNER/rmsb-api-gateway:latest \
                            ./api-gateway
                        docker push $REGISTRY/$OWNER/rmsb-api-gateway:latest
                    '''
                }
            }
        }

        stage('Deploy to VM') {
            steps {
                sshagent(credentials: ['vm-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no $VM_USER@$VM_HOST "
                            cd $DEPLOY_PATH
                            git fetch origin
                            git reset --hard origin/main

                            mkdir -p services

                            # Fetch .env file for each active service from the registry DB
                            curl -sf http://localhost:8080/api/registry | \
                              jq -r '.[] | select(.status==\"active\") | .name' | \
                            while read name; do
                                curl -sf http://localhost:8080/api/registry/\$name/env \
                                  > services/.env.\$name
                            done

                            SERVICE_FILES=\$(ls services/docker-compose.*.service.yml 2>/dev/null | xargs -I{} printf -- '-f %s ' {})
                            docker compose -f docker-compose.yml \$SERVICE_FILES pull
                            docker compose -f docker-compose.yml \$SERVICE_FILES up -d --remove-orphans
                            echo Deployed at \$(date)
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed.'
        }
    }
}
