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
                            docker compose pull
                            docker compose up -d --remove-orphans
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
